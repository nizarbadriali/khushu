import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Blocker } from '../../../modules/salahlock-blocker';

import { fonts, useTheme } from '@/components/theme';
import { Button, PickerRow, Row, Screen, Section, ToggleRow, T } from '@/components/ui';
import {
  INTERVAL_OPTIONS,
  LockStart,
  MAX_INTERVAL,
  MIN_INTERVAL,
  parseInterval,
  PRAYER_LABEL,
  PrayerName,
} from '@/core/types';
import { useApp } from '@/store/app';

const CUSTOM = -1;

const LEAD_OPTIONS = [10, 15, 20, 30, 45, 60].map((m) => ({ value: m, label: `${m} minutes` }));
const GRACE_OPTIONS = [5, 10, 15, 20, 30].map((m) => ({ value: m, label: `${m} minutes` }));
const LOCK_OPTIONS: { value: LockStart; label: string }[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: 'afterFirstReminder', label: 'After the first reminder' },
  { value: 'grace', label: 'After a grace period' },
];

export default function PrayerSettingsScreen() {
  const t = useTheme();
  const { name } = useLocalSearchParams<{ name: PrayerName }>();
  const s = useApp((state) => state.settings.prayers[name]);
  const lockOn = useApp((state) => state.settings.lockEnabled);
  const update = useApp((state) => state.updatePrayer);
  const set = (patch: Parameters<typeof update>[1]) => update(name, patch);

  const standard = INTERVAL_OPTIONS.includes(s.intervalMin);
  const [custom, setCustom] = useState(standard ? '' : String(s.intervalMin));
  const [editing, setEditing] = useState(false);
  const parsed = parseInterval(custom);

  const intervalOptions = [
    ...INTERVAL_OPTIONS.map((m) => ({ value: m, label: `Every ${m} minutes` })),
    { value: CUSTOM, label: standard ? 'Custom' : `Custom (${s.intervalMin} minutes)` },
  ];

  return (
    <Screen title={`${PRAYER_LABEL[name]} settings`} back>
      <Section label="Reminders">
        <ToggleRow title="Reminders" value={s.enabled} onChange={(enabled) => set({ enabled })} />
        <PickerRow
          title="Reminder interval"
          value={standard ? s.intervalMin : CUSTOM}
          options={intervalOptions}
          onChange={(v) => {
            if (v === CUSTOM) setEditing(true);
            else {
              setEditing(false);
              set({ intervalMin: v });
            }
          }}
        />
        {editing ? (
          <View style={{ gap: 8, paddingVertical: 10 }}>
            <TextInput
              accessibilityLabel="Custom interval in minutes"
              autoFocus
              keyboardType="number-pad"
              placeholder="Minutes"
              placeholderTextColor={t.muted}
              value={custom}
              onChangeText={setCustom}
              style={{
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                minHeight: 48,
                color: t.text,
                fontFamily: fonts.regular,
                fontSize: 16,
              }}
            />
            {custom && parsed === null ? (
              <T variant="small" color={t.danger}>
                Enter a whole number from {MIN_INTERVAL} to {MAX_INTERVAL}.
              </T>
            ) : null}
            <Button
              title="Save interval"
              disabled={parsed === null}
              onPress={() => {
                if (parsed === null) return;
                set({ intervalMin: parsed });
                setEditing(false);
              }}
            />
          </View>
        ) : null}
        <ToggleRow title="Adhan" value={s.adhan} onChange={(adhan) => set({ adhan })} />
        <ToggleRow
          title="End-of-window warning"
          detail="An extra reminder before the window closes"
          value={s.warningEnabled}
          onChange={(warningEnabled) => set({ warningEnabled })}
          last={!s.warningEnabled}
        />
        {s.warningEnabled ? (
          <PickerRow
            title="Warn before cutoff"
            value={s.warningLeadMin}
            options={LEAD_OPTIONS}
            onChange={(warningLeadMin) => set({ warningLeadMin })}
            last
          />
        ) : null}
      </Section>

      <Section
        label="Kushu"
        note={
          !Blocker
            ? 'App restrictions are not available here, so this saves but restricts nothing.'
            : lockOn
              ? undefined
              : 'Turn on Kushu Mode in Settings for this to take effect.'
        }>
        <ToggleRow
          title="Restrict apps for this prayer"
          value={s.lockEnabled}
          onChange={(lockEnabled) => set({ lockEnabled })}
          last={!s.lockEnabled}
        />
        {s.lockEnabled ? (
          <PickerRow
            title="Restriction begins"
            value={s.lockStart}
            options={LOCK_OPTIONS}
            onChange={(lockStart) => set({ lockStart })}
            last={s.lockStart !== 'grace'}
          />
        ) : null}
        {s.lockEnabled && s.lockStart === 'grace' ? (
          <PickerRow
            title="Grace period"
            value={s.graceMin}
            options={GRACE_OPTIONS}
            onChange={(graceMin) => set({ graceMin })}
            last
          />
        ) : null}
      </Section>

      {name === 'fajr' ? (
        <T variant="small" style={{ marginHorizontal: 4 }}>
          Fajr ends at sunrise, so its reminders and restrictions stop there.
        </T>
      ) : null}

      <Row title="Changes save automatically." last />
    </Screen>
  );
}
