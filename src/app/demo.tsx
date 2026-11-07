import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Blocker } from '../../modules/salahlock-blocker';

import { GeometricPattern, Icon } from '@/components/art';
import { fonts, useTheme } from '@/components/theme';
import { Banner, Button, Card, PrayerAnswers, Screen, Segmented, T } from '@/components/ui';
import {
  confirmDemo,
  createDemo,
  deferDemo,
  demoBlock,
  demoPending,
  demoStatus,
  DemoState,
  fastForward,
  setDemoInterval,
  startPrayer,
} from '@/core/demoEngine';
import { formatTime } from '@/core/format';
import { reminderCopy } from '@/core/reminderPlan';
import { PRAYER_LABEL } from '@/core/types';
import { usePermissions } from '@/hooks/use-permissions';
import { dismissAllDemo, NOTIFICATIONS_AVAILABLE, presentDemo } from '@/services/notifications';
import { useApp } from '@/store/app';

const REAL_BLOCK_MS = 5 * 60_000;

const STATUS_LABEL = {
  UPCOMING: 'Upcoming',
  ACTIVE_UNCONFIRMED: 'Active, not confirmed',
  CONFIRMED: 'Confirmed',
  WINDOW_ENDED_UNCONFIRMED: 'Window ended',
};

export default function Demo() {
  const t = useTheme();
  const settings = useApp((s) => s.settings);
  const permissions = usePermissions();
  const [demo, setDemo] = useState<DemoState>(() => createDemo(Date.now()));
  const [simShield, setSimShield] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const realBlockRef = useRef(false);

  const status = demoStatus(demo);
  const pending = demoPending(demo);
  const block = demoBlock(demo);
  const b = permissions.blocker;
  const realBlocking = Boolean(
    Blocker && b?.usageAccess && b?.overlay && settings.lockedApps.length > 0,
  );
  const time = (ms: number) => formatTime(ms, settings.timeFormat);

  const stopRealBlock = () => {
    if (realBlockRef.current) Blocker?.stopDemoBlock();
    realBlockRef.current = false;
  };

  // Leaving the screen must never leave a demo restriction behind.
  useEffect(() => stopRealBlock, []);

  const fire = (next: DemoState) => {
    const newest = next.fired[next.fired.length - 1];
    if (next.fired.length > demo.fired.length && newest) {
      presentDemo(newest.kind, newest.prayer, settings);
    }
    setDemo(next);
  };

  const restrict = () => {
    setRestricted(true);
    if (realBlocking) {
      realBlockRef.current = true;
      Blocker?.startDemoBlock('Asr (Demo)', REAL_BLOCK_MS);
    } else {
      setSimShield(true);
    }
  };

  const confirm = () => {
    setDemo(confirmDemo(demo));
    setRestricted(false);
    stopRealBlock();
    dismissAllDemo();
  };

  const reset = () => {
    stopRealBlock();
    dismissAllDemo();
    setRestricted(false);
    setDemo(createDemo(Date.now()));
  };

  const active = status === 'ACTIVE_UNCONFIRMED';
  const newest = demo.fired[demo.fired.length - 1];
  const newestCopy = newest ? reminderCopy(newest.kind, PRAYER_LABEL[newest.prayer]) : null;
  const lockNames = settings.lockedApps.map((a) => a.label).join(', ');

  return (
    <Screen title="Demo Mode" back>
      <Banner
        tone="warn"
        text="Simulated clock. Nothing here changes your real prayer records, reminders or settings."
      />

      <View style={[styles.clock, { backgroundColor: t.forest }]}>
        <GeometricPattern color={t.gold} opacity={0.14} />
        <T variant="label" color={t.gold}>
          SIMULATED TIME
        </T>
        <T style={styles.clockTime}>{time(demo.simNowMs)}</T>
        <T style={styles.clockStatus}>Asr: {STATUS_LABEL[status]}</T>
      </View>

      {!NOTIFICATIONS_AVAILABLE && newestCopy && status !== 'CONFIRMED' ? (
        <Banner
          tone="ok"
          text={`SIMULATED NOTIFICATION: ${newestCopy.title}
${newestCopy.body}`}
        />
      ) : null}

      <Step n={1} title="Start the prayer" done={status !== 'UPCOMING'}>
        <Button
          title="Simulate Asr starting"
          icon="bell"
          disabled={status !== 'UPCOMING'}
          onPress={() => fire(startPrayer(demo))}
        />
      </Step>

      <Step n={2} title="Choose the reminder interval">
        <Segmented
          value={String(demo.settings.intervalMin)}
          options={[
            { value: '30', label: '30 min' },
            { value: '10', label: '10 min' },
          ]}
          onChange={(v) => setDemo(setDemoInterval(demo, Number(v)))}
        />
        <T variant="small">
          {pending.length} reminders pending
          {pending[0] ? `, next at ${time(pending[0].atMs)}` : ''}
        </T>
      </Step>

      <Step n={3} title="Fast-forward to the next reminder" done={demo.fired.length > 1}>
        <Button
          title="Skip ahead"
          icon="forward"
          kind="secondary"
          disabled={!active}
          onPress={() => fire(fastForward(demo))}
        />
        <T variant="small">
          {demo.fired.length} notifications {NOTIFICATIONS_AVAILABLE ? 'sent' : 'simulated'} so far
        </T>
      </Step>

      <Step n={4} title="Restrict apps" done={restricted}>
        <T variant="small">
          {realBlocking
            ? `REAL: ${lockNames} will be blocked on this device for up to 5 minutes. Press Home and open one to see it.`
            : Blocker
              ? 'SIMULATED: real blocking needs permissions and selected apps in Kushu Mode, so this shows a preview of the shield.'
              : 'SIMULATED: this device cannot restrict other apps, so this only shows a preview of the shield.'}
        </T>
        <Button
          title={realBlocking ? 'Restrict selected apps' : 'Preview shield (simulated)'}
          icon="lock"
          kind="secondary"
          disabled={!active || !block || restricted}
          onPress={restrict}
        />
      </Step>

      <Step n={5} title="Confirm the prayer" done={status === 'CONFIRMED'}>
        {status === 'CONFIRMED' ? (
          <Animated.View entering={FadeIn} style={{ gap: 4 }}>
            <T color={t.green} style={{ fontFamily: fonts.semibold }}>
              Asr confirmed. 0 reminders pending. Restrictions removed.
            </T>
            <T variant="small">Dashboard progress for this demo: 1 of 1</T>
          </Animated.View>
        ) : (
          <>
            <PrayerAnswers
              disabled={!active}
              onYes={confirm}
              onNotYet={() => setDemo(deferDemo(demo))}
            />
            {demo.deferred ? (
              <T variant="small">
                Not yet: Asr stays unconfirmed, {pending.length} reminders stay scheduled
                {pending[0] ? ` (next at ${time(pending[0].atMs)})` : ''}
                {restricted ? ' and apps stay restricted.' : '.'}
              </T>
            ) : null}
          </>
        )}
      </Step>

      <View style={{ gap: 10 }}>
        <Button kind="secondary" title="Reset demo" onPress={reset} />
        <Button
          kind="secondary"
          title="Exit Demo Mode"
          onPress={() => {
            reset();
            router.back();
          }}
        />
      </View>

      <Modal visible={simShield} animationType="fade" onRequestClose={() => setSimShield(false)}>
        <View style={[styles.shield, { backgroundColor: t.forest }]}>
          <GeometricPattern color={t.gold} opacity={0.14} />
          <View style={[styles.simBadge, { backgroundColor: t.gold }]}>
            <T variant="label" color={t.forest}>
              SIMULATED SHIELD
            </T>
          </View>
          <Icon name="lock" size={44} color={t.gold} />
          <T style={styles.shieldTitle}>It&apos;s time for Asr</T>
          <T style={styles.shieldBody}>
            This is how a selected app looks during a prayer. No app is blocked right now.
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSimShield(false)}
            style={[styles.shieldButton, { backgroundColor: t.gold }]}>
            <T color={t.forest} style={{ fontFamily: fonts.semibold }}>
              Open Kushu
            </T>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.stepHead}>
        <View style={[styles.stepNumber, { backgroundColor: done ? t.green : t.emerald }]}>
          {done ? (
            <Icon name="check" size={14} color="#FFFFFF" width={3} />
          ) : (
            <T variant="small" color={t.ivory} style={{ fontFamily: fonts.semibold }}>
              {n}
            </T>
          )}
        </View>
        <T variant="heading" style={{ flex: 1 }}>
          {title}
        </T>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  clock: { borderRadius: 22, padding: 20, overflow: 'hidden', gap: 2 },
  clockTime: { color: '#FAF8F3', fontFamily: fonts.display, fontSize: 38, lineHeight: 46 },
  clockStatus: { color: '#FAF8F3', opacity: 0.8, fontFamily: fonts.regular, fontSize: 14 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumber: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  shield: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  simBadge: { position: 'absolute', top: 56, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  shieldTitle: { color: '#FAF8F3', fontFamily: fonts.display, fontSize: 32, lineHeight: 40, textAlign: 'center' },
  shieldBody: { color: '#FAF8F3', opacity: 0.8, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center' },
  shieldButton: { alignSelf: 'stretch', minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
