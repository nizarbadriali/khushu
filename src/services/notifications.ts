import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { desiredEvents, reminderCopy, ReminderEvent, ReminderKind } from '@/core/reminderPlan';
import { belongsToInstance, reconcilePlan } from '@/core/scheduler';
import {
  AppSettings,
  PRAYER_LABEL,
  PrayerInstance,
  PrayerName,
  PrayerRecords,
  SoundChoice,
} from '@/core/types';

/** False in notifications.web.ts, where screens must not imply a reminder was delivered. */
export const NOTIFICATIONS_AVAILABLE: boolean = true;

const CATEGORY = 'prayer_prompt';
export const ACTION_PRAYED = 'PRAYED';
export const ACTION_LATER = 'LATER';

/** Android allows 500 alarms per app and iOS 64 pending notifications. */
const MAX_PENDING = Platform.OS === 'ios' ? 60 : 200;

const SOUND_FILE: Record<SoundChoice, string | null> = {
  adhan: 'adhan_short.wav',
  chime: 'chime.wav',
  system: null,
};

// Channel sound and vibration are fixed once created, so each combination is its own channel.
const startChannel = (sound: SoundChoice, vibrate: boolean) =>
  `sl_start_${sound}_${vibrate ? 'v' : 'q'}`;
const reminderChannel = (vibrate: boolean) => `sl_reminder_${vibrate ? 'v' : 'q'}`;

export function channelFor(
  e: Pick<ReminderEvent, 'kind' | 'prayer'>,
  settings: AppSettings,
): string {
  const useAdhan = settings.adhanEnabled && settings.prayers[e.prayer].adhan;
  return e.kind === 'start' && useAdhan
    ? startChannel(settings.sound, settings.vibrate)
    : reminderChannel(settings.vibrate);
}

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    {
      identifier: ACTION_PRAYED,
      buttonTitle: 'Yes, I Prayed',
      // Opening the app makes confirmation dependable: background JS may not run.
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_LATER,
      buttonTitle: 'Not Yet',
      // Deliberately no work: the existing recurring schedule is the reminder.
      options: { opensAppToForeground: false },
    },
  ]);

  if (Platform.OS !== 'android') return;
  const importance = AndroidImportance.HIGH;
  const vibration = [0, 300, 200, 300];

  for (const vibrate of [true, false]) {
    await Notifications.setNotificationChannelAsync(reminderChannel(vibrate), {
      name: vibrate ? 'Prayer reminders' : 'Prayer reminders (no vibration)',
      importance,
      enableVibrate: vibrate,
      vibrationPattern: vibrate ? vibration : undefined,
    });
    for (const sound of Object.keys(SOUND_FILE) as SoundChoice[]) {
      await Notifications.setNotificationChannelAsync(startChannel(sound, vibrate), {
        name: `Prayer start: ${sound}${vibrate ? '' : ' (no vibration)'}`,
        importance,
        sound: SOUND_FILE[sound] ?? undefined,
        enableVibrate: vibrate,
        vibrationPattern: vibrate ? vibration : undefined,
      });
    }
  }
}

export async function notificationPermission() {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return { granted: status === 'granted', canAskAgain };
}

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

interface PayloadInstance {
  instanceId: string;
  prayer: PrayerName;
  date: string;
  startMs: number;
  cutoffMs: number;
}

function content(kind: ReminderKind, prayer: PrayerName, data: Record<string, unknown>) {
  return {
    ...reminderCopy(kind, PRAYER_LABEL[prayer]),
    categoryIdentifier: CATEGORY,
    data,
  };
}

export async function syncNotifications(
  instances: PrayerInstance[],
  records: PrayerRecords,
  settings: AppSettings,
  nowMs: number,
) {
  const desired = settings.notificationsEnabled
    ? desiredEvents(instances, records, (p) => settings.prayers[p], nowMs, MAX_PENDING)
    : [];
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const plan = reconcilePlan(
    pending.map((n) => n.identifier),
    desired,
    (e) => channelFor(e, settings),
  );

  await Promise.all(plan.cancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));

  const byId = new Map(instances.map((i) => [i.id, i]));
  for (const { id, event } of plan.schedule) {
    const instance = byId.get(event.instanceId);
    if (!instance) continue;
    const payload: PayloadInstance = {
      instanceId: instance.id,
      prayer: instance.prayer,
      date: instance.date,
      startMs: instance.startMs,
      cutoffMs: instance.cutoffMs,
    };
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: content(event.kind, event.prayer, { ...payload }),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: event.atMs,
        channelId: channelFor(event, settings),
      },
    });
  }
}

/** Clears any reminders for this prayer already sitting in the notification shade. */
export async function dismissPresented(instanceId: string) {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((n) => belongsToInstance(n.request.identifier, instanceId))
      .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
  );
}

export function instanceFromResponse(
  response: Notifications.NotificationResponse,
): PrayerInstance | null {
  const d = response.notification.request.content.data as unknown as PayloadInstance | undefined;
  if (!d?.instanceId || !d.prayer) return null;
  return {
    id: d.instanceId,
    prayer: d.prayer,
    date: d.date,
    startMs: d.startMs,
    cutoffMs: d.cutoffMs,
  };
}

/** Reports notification taps, including the one that launched the app. Returns an unsubscribe. */
export function listenForResponses(
  handler: (response: Notifications.NotificationResponse) => void,
): () => void {
  // A tap that launched the app arrives here rather than through the listener.
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      handler(response);
      Notifications.clearLastNotificationResponseAsync();
    }
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}

/** Demo Mode: a real notification, delivered now, carrying no real prayer instance. */
export async function presentDemo(
  kind: ReminderKind,
  prayer: PrayerName,
  settings: AppSettings,
) {
  const copy = reminderCopy(kind, PRAYER_LABEL[prayer]);
  await Notifications.scheduleNotificationAsync({
    content: { ...copy, title: `[Demo] ${copy.title}`, data: { demo: true } },
    trigger: { channelId: channelFor({ kind, prayer }, settings) },
  });
}

export const dismissAllDemo = async () => {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((n) => n.request.content.data?.demo)
      .map((n) => Notifications.dismissNotificationAsync(n.request.identifier)),
  );
};
