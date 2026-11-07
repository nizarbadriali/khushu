import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppSettings, PrayerInstance, PrayerRecords } from '@/core/types';
import {
  activityKey,
  buildActivityProps,
  buildWidgetTimeline,
  DASHBOARD_URL,
  planLiveActivity,
  WidgetSnapshot,
} from '@/core/widgetData';
import type { SurfaceStatus } from '@/services/surfaces';
import {
  DashboardWidget,
  NextPrayerActivity,
  NextPrayerWidget,
  TodayWidget,
} from '@/widgets';

const STORAGE_KEY = 'kushu.liveActivity.v1';

type ActivityState = 'off' | 'running' | 'dismissed' | 'blocked' | 'waiting';

let activityState: ActivityState = 'waiting';
let activityLabel: string | null = null;
let lastKey: string | null = null;
let lastTimeline: string | null = null;

function syncWidgets(
  instances: PrayerInstance[],
  records: PrayerRecords,
  settings: AppSettings,
  nowMs: number,
): WidgetSnapshot {
  const options = { timeFormat: settings.timeFormat, countdown: settings.countdownEnabled };
  const entries = buildWidgetTimeline(instances, records, options, nowMs);

  // Reloads spend WidgetKit's budget, so only send a timeline that says something new.
  const key = JSON.stringify(entries.map((e) => ({ ...e.props, atMs: 0 })));
  if (key !== lastTimeline) {
    const timeline = entries.map((e) => ({ date: new Date(e.atMs), props: e.props }));
    for (const widget of [NextPrayerWidget, TodayWidget, DashboardWidget]) {
      widget.updateTimeline(timeline);
    }
    lastTimeline = key;
  }
  return entries[0].props;
}

async function syncActivity(snapshot: WidgetSnapshot, enabled: boolean) {
  const running = NextPrayerActivity.getInstances();
  const byId = new Map(running.map((a) => [a.getId(), a]));
  const lastPrayerId = await AsyncStorage.getItem(STORAGE_KEY);
  const desired = buildActivityProps(snapshot);
  const plan = planLiveActivity({
    enabled,
    desired,
    existingIds: [...byId.keys()],
    lastPrayerId,
    lastKey,
  });

  await Promise.all(plan.end.map((id) => byId.get(id)?.end('immediate')));
  activityLabel = desired?.label ?? null;

  if (!enabled || !desired) {
    activityState = enabled ? 'waiting' : 'off';
    return;
  }

  const staleDate = new Date(desired.startMs);
  if (plan.keep) {
    if (plan.update) await byId.get(plan.keep)?.update(desired, staleDate);
    activityState = 'running';
  } else if (plan.start) {
    try {
      NextPrayerActivity.start(desired, DASHBOARD_URL, staleDate);
      activityState = 'running';
    } catch (e) {
      // ActivityKit refuses when the user has turned Live Activities off for Kushu.
      console.warn('Live Activity not started', e);
      activityState = 'blocked';
      return;
    }
  } else {
    activityState = 'dismissed';
    return;
  }

  lastKey = activityKey(desired);
  await AsyncStorage.setItem(STORAGE_KEY, desired.prayerId);
}

export async function syncSurfaces(
  instances: PrayerInstance[],
  records: PrayerRecords,
  settings: AppSettings,
  nowMs: number,
) {
  const snapshot = syncWidgets(instances, records, settings, nowMs);
  await syncActivity(snapshot, settings.liveActivityEnabled);
}

const ACTIVITY_TEXT: Record<ActivityState, string> = {
  off: 'Off',
  running: 'Running',
  dismissed: 'Dismissed, returns for the next prayer',
  blocked: 'Turned off in iOS Settings',
  waiting: 'Starts when Kushu opens',
};

export function surfaceStatus(_settings: AppSettings): SurfaceStatus {
  return {
    simulated: false,
    rows: [
      { title: 'Home Screen widgets', value: 'Available', detail: 'Add them from the iOS widget gallery.' },
      {
        title: 'Live Activity',
        value: ACTIVITY_TEXT[activityState],
        detail: activityState === 'running' && activityLabel ? `Counting down to ${activityLabel}.` : undefined,
      },
      { title: 'Dynamic Island', value: 'On supported iPhones' },
    ],
  };
}
