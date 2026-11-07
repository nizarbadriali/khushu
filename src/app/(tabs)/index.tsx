import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { GeometricPattern, Icon, LogoMark } from '@/components/art';
import { fonts, useTheme } from '@/components/theme';
import { Banner, Button, Card, PrayerAnswers, Screen, T } from '@/components/ui';
import { formatDuration, formatTime } from '@/core/format';
import { hijriDate } from '@/core/hijri';
import { isPromptCollapsed, nextReminderAt } from '@/core/notYet';
import {
  activeInstance,
  instancesAround,
  localDateKey,
  nextInstance,
} from '@/core/prayerTimes';
import { deriveStatus } from '@/core/stateMachine';
import { PRAYER_LABEL, PrayerInstance, PrayerStatus } from '@/core/types';
import { useNow } from '@/hooks/use-now';
import { usePermissions } from '@/hooks/use-permissions';
import { calcOptions, confirmAndRelease, correctAndReconcile } from '@/services/engine';
import { NOTIFICATIONS_AVAILABLE, requestNotificationPermission } from '@/services/notifications';
import { useApp } from '@/store/app';

const STATUS_TEXT: Record<PrayerStatus, string> = {
  UPCOMING: 'Upcoming',
  ACTIVE_UNCONFIRMED: 'Now',
  CONFIRMED: 'Completed',
  WINDOW_ENDED_UNCONFIRMED: 'Not confirmed',
};

export default function Home() {
  const t = useTheme();
  const now = useNow();
  const settings = useApp((s) => s.settings);
  const records = useApp((s) => s.records);
  const deferrals = useApp((s) => s.deferrals);
  const defer = useApp((s) => s.defer);
  const permissions = usePermissions();
  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);

  const dayKey = localDateKey(new Date(now));
  const instances = useMemo(() => {
    const opts = calcOptions(settings);
    return opts ? instancesAround(new Date(`${dayKey}T12:00:00`).getTime(), opts, 1) : [];
  }, [settings, dayKey]);

  const today = instances.filter((i) => i.date === dayKey);
  const active = activeInstance(instances, now);
  const next = nextInstance(instances, now);
  const activeStatus = active ? deriveStatus(active, records[active.id], now) : null;
  const confirmedToday = today.filter((i) => records[i.id]?.confirmedAtMs != null).length;
  const time = (ms: number) => formatTime(ms, settings.timeFormat);

  const activeSettings = active ? settings.prayers[active.prayer] : null;
  const nextReminder =
    active && activeSettings
      ? nextReminderAt(active, activeSettings, settings.notificationsEnabled, now)
      : null;
  const collapsed = active ? isPromptCollapsed(deferrals, active.id, now) : false;
  const windowEnd = (i: PrayerInstance) =>
    i.prayer === 'fajr' ? `${time(i.cutoffMs)} (sunrise)` : time(i.cutoffMs);

  const notYet = (instance: PrayerInstance) => {
    Haptics.selectionAsync();
    defer(instance, nextReminder, now);
  };

  const confirm = async (instance: PrayerInstance) => {
    setJustConfirmed(instance.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await confirmAndRelease(instance);
  };

  const hijri = hijriDate(new Date(now));
  const gregorian = new Date(now).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Screen>
      <View style={styles.header}>
        <LogoMark color={t.emerald} accent={t.gold} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.display, fontSize: 21 }}>Kushu</T>
          <View style={styles.place}>
            <Icon name="pin" size={13} color={t.muted} />
            <T variant="small" numberOfLines={1}>
              {settings.location?.label}
            </T>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={12}
          onPress={() => router.navigate('/settings')}>
          <Icon name="sliders" color={t.text} size={24} />
        </Pressable>
      </View>

      <View>
        <T style={{ fontFamily: fonts.medium }}>{gregorian}</T>
        <T variant="small" color={t.goldText}>
          {hijri.day} {hijri.month} {hijri.year} AH
        </T>
      </View>

      {!NOTIFICATIONS_AVAILABLE ? (
        <Banner tone="warn" text="Browser preview: prayer times, confirmation and history work here. Reminders, Adhan alerts and app blocking only run on a phone." />
      ) : !permissions.notifications ? (
        <Banner
          tone="danger"
          text="Notifications are off, so Kushu cannot remind you."
          action={permissions.canAskNotifications ? 'Turn on' : 'Settings'}
          onPress={async () => {
            if (permissions.canAskNotifications) await requestNotificationPermission();
            else Linking.openSettings();
            permissions.refresh();
          }}
        />
      ) : null}

      {active && activeStatus === 'ACTIVE_UNCONFIRMED' && collapsed ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
          <Card style={styles.deferred}>
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontFamily: fonts.semibold }}>{PRAYER_LABEL[active.prayer]} not prayed yet</T>
              <T variant="small">
                {nextReminder === null
                  ? `No more reminders. Open until ${windowEnd(active)}.`
                  : NOTIFICATIONS_AVAILABLE
                    ? `Next reminder at ${time(nextReminder)}`
                    : `Next reminder at ${time(nextReminder)} on your phone`}
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yes, I Prayed"
              onPress={() => confirm(active)}
              style={[styles.deferredYes, { backgroundColor: t.green }]}>
              <Icon name="check" size={16} color="#FFFFFF" width={3} />
              <T variant="small" color="#FFFFFF" style={{ fontFamily: fonts.semibold }}>
                I Prayed
              </T>
            </Pressable>
          </Card>
        </Animated.View>
      ) : null}

      {active && activeStatus === 'ACTIVE_UNCONFIRMED' && !collapsed ? (
        <Animated.View entering={FadeInDown} exiting={FadeOut} layout={LinearTransition}>
          <Card style={{ gap: 14, paddingVertical: 20, borderColor: t.green, borderWidth: 1.5 }}>
            <View style={{ gap: 4 }}>
              <T variant="title">Have you prayed {PRAYER_LABEL[active.prayer]}?</T>
              <T color={t.muted}>
                {formatDuration(active.cutoffMs - now)} left, until {windowEnd(active)}
              </T>
            </View>
            <PrayerAnswers onYes={() => confirm(active)} onNotYet={() => notYet(active)} />
          </Card>
        </Animated.View>
      ) : null}

      {active && activeStatus === 'CONFIRMED' && justConfirmed === active.id ? (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.success, { backgroundColor: t.greenSoft }]}>
          <Icon name="check" color={t.green} size={22} width={3} />
          <T style={{ flex: 1, fontFamily: fonts.medium }} color={t.green}>
            {PRAYER_LABEL[active.prayer]} confirmed. Reminders stopped.
          </T>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              setJustConfirmed(null);
              correctAndReconcile(active, false);
            }}>
            <T variant="small" color={t.green} style={{ fontFamily: fonts.semibold }}>
              Undo
            </T>
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View layout={LinearTransition} style={[styles.hero, { backgroundColor: t.forest }]}>
        <GeometricPattern color={t.gold} opacity={0.16} />
        <T variant="label" color={t.gold}>
          NEXT PRAYER
        </T>
        {next ? (
          <>
            <T style={styles.heroName}>{PRAYER_LABEL[next.prayer]}</T>
            <T style={styles.heroTime}>{time(next.startMs)}</T>
            <T style={styles.heroCount}>Begins in {formatDuration(next.startMs - now)}</T>
          </>
        ) : null}
      </Animated.View>

      <Card style={{ gap: 10 }}>
        <View style={styles.progressHead}>
          <T variant="heading">Today</T>
          <T color={t.muted}>{confirmedToday} of 5 confirmed</T>
        </View>
        <View style={styles.progressTrack}>
          {today.map((i) => (
            <View
              key={i.id}
              style={[
                styles.progressCell,
                { backgroundColor: records[i.id]?.confirmedAtMs != null ? t.green : t.border },
              ]}
            />
          ))}
        </View>
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        {today.map((i, index) => {
          const status = deriveStatus(i, records[i.id], now);
          const live = status === 'ACTIVE_UNCONFIRMED';
          const done = status === 'CONFIRMED';
          return (
            <View
              key={i.id}
              style={[
                styles.prayerRow,
                index < today.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: t.border,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: live ? fonts.semibold : fonts.medium }}>
                  {PRAYER_LABEL[i.prayer]}
                </T>
                {i.prayer === 'fajr' ? <T variant="small">Sunrise {time(i.cutoffMs)}</T> : null}
              </View>
              <T color={t.muted} style={{ width: 84 }}>
                {time(i.startMs)}
              </T>
              <View style={styles.status}>
                {done ? <Icon name="check" size={14} color={t.green} width={2.6} /> : null}
                <T
                  variant="small"
                  color={done ? t.green : live ? t.goldText : t.muted}
                  style={live || done ? { fontFamily: fonts.medium } : undefined}>
                  {STATUS_TEXT[status]}
                </T>
              </View>
            </View>
          );
        })}
      </Card>

      <Button
        kind="secondary"
        icon="spark"
        title="Try Demo Mode"
        onPress={() => router.push('/demo')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  hero: { borderRadius: 24, padding: 22, overflow: 'hidden', gap: 2 },
  heroName: { color: '#FAF8F3', fontFamily: fonts.display, fontSize: 44, lineHeight: 52, marginTop: 6 },
  heroTime: { color: '#FAF8F3', fontFamily: fonts.medium, fontSize: 20, lineHeight: 26 },
  heroCount: { color: '#FAF8F3', opacity: 0.75, fontFamily: fonts.regular, fontSize: 14, marginTop: 8 },
  deferred: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  deferredYes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  success: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressCell: { flex: 1, height: 8, borderRadius: 4 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: 104 },
});
