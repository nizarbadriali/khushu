import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Blocker, InstalledApp } from '../../modules/salahlock-blocker';

import { Icon } from '@/components/art';
import { useTheme } from '@/components/theme';
import { Banner, Button, Card, Row, Screen, Section, ToggleRow, T } from '@/components/ui';
import { PRAYER_LABEL, PRAYERS } from '@/core/types';
import { usePermissions } from '@/hooks/use-permissions';
import { reconcile } from '@/services/engine';
import { useApp } from '@/store/app';

export default function LockScreen() {
  const t = useTheme();
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const updatePrayer = useApp((s) => s.updatePrayer);
  const permissions = usePermissions();
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    Blocker?.getInstalledApps()
      .then(setApps)
      .catch(() => setApps([]));
  }, []);

  if (!Blocker) {
    return (
      <Screen title="Kushu Mode" back>
        <Banner
          tone="warn"
          text={
            Platform.OS === 'web'
              ? 'A browser cannot restrict other apps, so nothing is blocked here. App blocking needs the Android app.'
              : `App restrictions are not available on ${Platform.OS} in this build. Reminders and confirmation still work.`
          }
        />
        <Card style={{ gap: 10 }}>
          <T variant="heading">How it behaves on Android</T>
          <T color={t.muted}>
            You choose the apps. During a chosen prayer they are covered by a shield until you
            confirm in Kushu. It always ends at the prayer cutoff, and calls and system settings are
            never restricted.
          </T>
        </Card>
        <Button
          kind="secondary"
          icon="spark"
          title="See a simulation in Demo Mode"
          onPress={() => router.push('/demo')}
        />
      </Screen>
    );
  }

  const status = permissions.blocker;
  const ready = Boolean(status?.usageAccess && status?.overlay);
  const selected = new Set(settings.lockedApps.map((a) => a.packageName));
  const activeId = status?.activeWindowId;

  const toggleApp = (app: InstalledApp) => {
    const lockedApps = selected.has(app.packageName)
      ? settings.lockedApps.filter((a) => a.packageName !== app.packageName)
      : [...settings.lockedApps, { packageName: app.packageName, label: app.label }];
    update({ lockedApps });
  };

  const emergencyUnlock = async () => {
    if (activeId) await Blocker?.release(activeId);
    await reconcile();
    permissions.refresh();
  };

  const visible = showAll ? apps : apps?.slice(0, 8);

  return (
    <Screen title="Kushu Mode" back>
      <T color={t.muted}>
        You choose the apps. During a chosen prayer they are covered by a shield until you confirm
        in Kushu. It always ends at the prayer cutoff, and calls and system settings are never
        restricted.
      </T>

      {activeId ? (
        <Banner tone="warn" text={`Restrictions are active for ${status?.activeLabel}.`} />
      ) : null}

      <Section label="Status">
        <ToggleRow
          title="Enable Kushu Mode"
          detail={ready ? undefined : 'Grant both permissions below first'}
          value={settings.lockEnabled}
          disabled={!ready && !settings.lockEnabled}
          onChange={(lockEnabled) => update({ lockEnabled })}
        />
        <Row
          title="Usage access"
          detail="Detects when a selected app opens. Nothing leaves your device."
          value={status?.usageAccess ? 'Granted' : 'Grant'}
          onPress={status?.usageAccess ? undefined : () => Blocker?.openUsageAccessSettings()}
        />
        <Row
          title="Display over other apps"
          detail="Draws the prayer shield."
          value={status?.overlay ? 'Granted' : 'Grant'}
          onPress={status?.overlay ? undefined : () => Blocker?.openOverlaySettings()}
          last
        />
      </Section>

      {settings.lockEnabled && !ready ? (
        <Banner
          tone="danger"
          text="A permission was removed, so restrictions are off. Your reminders still work."
        />
      ) : null}

      <Section label={`Apps to restrict (${selected.size})`}>
        {!apps ? (
          <ActivityIndicator color={t.emerald} style={{ padding: 20 }} />
        ) : (
          visible?.map((app, i) => {
            const on = selected.has(app.packageName);
            return (
              <Pressable
                key={app.packageName}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={app.label}
                onPress={() => toggleApp(app)}
                style={[
                  styles.app,
                  i < (visible?.length ?? 0) - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: t.border,
                  },
                ]}>
                <Image
                  source={{ uri: `data:image/png;base64,${app.icon}` }}
                  style={styles.icon}
                  contentFit="contain"
                />
                <T style={{ flex: 1 }} numberOfLines={1}>
                  {app.label}
                </T>
                <View
                  style={[
                    styles.check,
                    { borderColor: on ? t.emerald : t.border },
                    on && { backgroundColor: t.emerald },
                  ]}>
                  {on ? <Icon name="check" size={15} color={t.ivory} width={3} /> : null}
                </View>
              </Pressable>
            );
          })
        )}
        {apps && apps.length > 8 ? (
          <Row
            title={showAll ? 'Show fewer' : `Show all ${apps.length} apps`}
            onPress={() => setShowAll(!showAll)}
            last
          />
        ) : null}
      </Section>

      <Section label="Prayers that activate restrictions">
        {PRAYERS.map((p, i) => (
          <ToggleRow
            key={p}
            title={PRAYER_LABEL[p]}
            value={settings.prayers[p].lockEnabled}
            onChange={(lockEnabled) => updatePrayer(p, { lockEnabled })}
            last={i === PRAYERS.length - 1}
          />
        ))}
      </Section>

      <Card style={{ gap: 10 }}>
        <T variant="heading">How it behaves</T>
        <T color={t.muted}>
          When a chosen prayer begins, opening a selected app shows a shield with a button back to
          Kushu. Confirming removes it right away. If you never confirm, it lifts on its own at
          the cutoff and the prayer stays marked as not confirmed.
        </T>
      </Card>

      <View style={{ gap: 10 }}>
        <Button
          kind="secondary"
          icon="unlock"
          title="Emergency unlock"
          disabled={!activeId}
          onPress={emergencyUnlock}
        />
        <T variant="small" style={{ textAlign: 'center' }}>
          Lifts the current restriction without marking the prayer as prayed.
        </T>
        <Button
          kind="danger"
          title="Turn off Kushu Mode"
          disabled={!settings.lockEnabled}
          onPress={() => update({ lockEnabled: false })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  app: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  icon: { width: 34, height: 34, borderRadius: 8 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
