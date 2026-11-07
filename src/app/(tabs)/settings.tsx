import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { Blocker } from '../../../modules/salahlock-blocker';

import { Icon } from '@/components/art';
import { useTheme } from '@/components/theme';
import { Banner, PickerRow, Row, Screen, Section, Segmented, ToggleRow, T } from '@/components/ui';
import { CALCULATION_METHODS } from '@/core/prayerTimes';
import { PRAYER_LABEL, PRAYERS, SoundChoice } from '@/core/types';
import { usePermissions } from '@/hooks/use-permissions';
import { NOTIFICATIONS_AVAILABLE, requestNotificationPermission } from '@/services/notifications';
import { useApp } from '@/store/app';

const SOUNDS: { value: SoundChoice; label: string }[] = [
  { value: 'adhan', label: 'Adhan (17 second clip)' },
  { value: 'chime', label: 'Soft chime' },
  { value: 'system', label: 'System default' },
];

export default function Settings() {
  const t = useTheme();
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const permissions = usePermissions();
  const player = useAudioPlayer(require('../../../assets/audio/adhan_full.mp3'));
  const playback = useAudioPlayerStatus(player);

  const toggleAdhan = () => {
    if (playback.playing) {
      player.pause();
      player.seekTo(0);
    } else {
      if (playback.didJustFinish) player.seekTo(0);
      player.play();
    }
  };

  const exact = permissions.blocker?.exactAlarm;

  return (
    <Screen title="Settings">
      {!NOTIFICATIONS_AVAILABLE ? (
        <Banner
          tone="warn"
          text="Browser preview: settings save here, but notifications and app blocking only run on a phone."
        />
      ) : !permissions.notifications ? (
        <Banner
          tone="danger"
          text="Notifications are off for Kushu."
          action={permissions.canAskNotifications ? 'Turn on' : 'Settings'}
          onPress={async () => {
            if (permissions.canAskNotifications) await requestNotificationPermission();
            else Linking.openSettings();
            permissions.refresh();
          }}
        />
      ) : null}
      {exact === false ? (
        <Banner
          tone="warn"
          text="Exact alarms are off, so reminders may arrive late. Battery savers can also delay delivery."
        />
      ) : null}

      <Section label="Kushu Mode">
        <Row
          title="App restrictions"
          detail="Pause distracting apps until you confirm"
          value={!Blocker ? 'Not available' : settings.lockEnabled ? 'On' : 'Off'}
          onPress={() => router.push('/lock')}
          last
        />
      </Section>

      <Section label="Prayers">
        {PRAYERS.map((p, i) => {
          const s = settings.prayers[p];
          return (
            <Row
              key={p}
              title={PRAYER_LABEL[p]}
              detail={s.enabled ? `Every ${s.intervalMin} min` : 'Reminders off'}
              value={Blocker && s.lockEnabled && settings.lockEnabled ? 'Locks apps' : undefined}
              last={i === PRAYERS.length - 1}
              onPress={() => router.push({ pathname: '/prayer/[name]', params: { name: p } })}
            />
          );
        })}
      </Section>

      <Section label="Notifications">
        <ToggleRow
          title="Prayer notifications"
          value={settings.notificationsEnabled}
          onChange={(notificationsEnabled) => update({ notificationsEnabled })}
        />
        <ToggleRow
          title="Vibration"
          value={settings.vibrate}
          onChange={(vibrate) => update({ vibrate })}
        />
        <ToggleRow
          title="Adhan at prayer start"
          value={settings.adhanEnabled}
          onChange={(adhanEnabled) => update({ adhanEnabled })}
        />
        <PickerRow
          title="Start sound"
          value={settings.sound}
          options={SOUNDS}
          onChange={(sound) => update({ sound })}
        />
        <Row
          title={playback.playing ? 'Stop full Adhan' : 'Play full Adhan'}
          detail="Plays inside the app"
          onPress={toggleAdhan}
          right={<Icon name={playback.playing ? 'stop' : 'play'} color={t.emerald} />}
          last
        />
      </Section>
      <T variant="small" style={{ marginHorizontal: 4, marginTop: -8 }}>
        Notifications play a short clip at most. Silent mode and Do Not Disturb can mute it. The
        full Adhan only plays when you start it here.
      </T>

      <Section
        label="Widgets & Live Activity"
        note="Widgets are added from your phone's widget gallery. Kushu cannot place them for you.">
        <ToggleRow
          title="Next-prayer Live Activity"
          detail="A countdown on the iPhone Lock Screen and Dynamic Island"
          value={settings.liveActivityEnabled}
          onChange={(liveActivityEnabled) => update({ liveActivityEnabled })}
        />
        <ToggleRow
          title="Countdown display"
          detail="Live countdowns in widgets and the Android notification"
          value={settings.countdownEnabled}
          onChange={(countdownEnabled) => update({ countdownEnabled })}
        />
        <Row
          title="Time format"
          detail="Follows Appearance below"
          value={settings.timeFormat === '12h' ? '12-hour' : '24-hour'}
        />
        <Row
          title="Preview and status"
          detail="Widget appearance and what this device supports"
          onPress={() => router.push('/widgets')}
          last
        />
      </Section>

      <Section
        label="Location and calculation"
        note="Calculation methods and prayer windows differ between scholars and communities. The reminder cutoffs here are app settings, not religious rulings. Please follow your own scholarship.">
        <Row
          title="Location"
          value={settings.location?.label}
          onPress={() => router.push('/location')}
        />
        <PickerRow
          title="Calculation method"
          value={settings.method}
          options={CALCULATION_METHODS.map((m) => ({ value: m.id, label: m.label }))}
          onChange={(method) => update({ method })}
        />
        <PickerRow
          title="Asr calculation"
          value={settings.asr}
          options={[
            { value: 'standard', label: 'Standard (Shafi, Maliki, Hanbali)' },
            { value: 'hanafi', label: 'Hanafi' },
          ]}
          onChange={(asr) => update({ asr })}
        />
        <PickerRow
          title="Isha reminders end"
          value={settings.ishaCutoff}
          options={[
            { value: 'midnight', label: 'At Islamic midnight' },
            { value: 'fajr', label: 'At the next Fajr' },
          ]}
          onChange={(ishaCutoff) => update({ ishaCutoff })}
          last
        />
      </Section>

      <Section label="Appearance">
        <Row
          title="Time format"
          last={false}
          right={
            <Segmented
              value={settings.timeFormat}
              options={[
                { value: '12h', label: '12h' },
                { value: '24h', label: '24h' },
              ]}
              onChange={(timeFormat) => update({ timeFormat })}
            />
          }
        />
        <PickerRow
          title="Theme"
          value={settings.appearance}
          options={[
            { value: 'system', label: 'Match system' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(appearance) => update({ appearance })}
          last
        />
      </Section>

      <T variant="small" style={{ marginHorizontal: 4 }}>
        Adhan recording: &quot;Beautiful adhan&quot; by Adam-synagda, Wikimedia Commons, CC0.
      </T>
    </Screen>
  );
}
