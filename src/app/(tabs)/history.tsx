import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/art';
import { fonts, useTheme } from '@/components/theme';
import { ActionSheet, Card, Screen, T } from '@/components/ui';
import { formatTime } from '@/core/format';
import { addDays, computeDay, localDateKey } from '@/core/prayerTimes';
import { deriveStatus } from '@/core/stateMachine';
import { PRAYER_LABEL, PrayerInstance, PRAYERS, PrayerStatus } from '@/core/types';
import { useNow } from '@/hooks/use-now';
import { calcOptions, correctAndReconcile } from '@/services/engine';
import { useApp } from '@/store/app';

const DAYS = 7;

const STATUS_SPOKEN: Record<PrayerStatus, string> = {
  UPCOMING: 'upcoming',
  ACTIVE_UNCONFIRMED: 'happening now, not confirmed',
  CONFIRMED: 'confirmed',
  WINDOW_ENDED_UNCONFIRMED: 'not confirmed',
};

export default function History() {
  const t = useTheme();
  const now = useNow(60_000);
  const settings = useApp((s) => s.settings);
  const records = useApp((s) => s.records);
  const [editing, setEditing] = useState<PrayerInstance | null>(null);
  const dayKey = localDateKey(new Date(now));

  const days = useMemo(() => {
    const opts = calcOptions(settings);
    if (!opts) return [];
    const today = new Date(`${dayKey}T12:00:00`);
    return Array.from({ length: DAYS }, (_, i) => computeDay(addDays(today, -i), opts));
  }, [settings, dayKey]);

  const instanceOf = (calculated: PrayerInstance): PrayerInstance => records[calculated.id] ?? calculated;

  const all = days.flatMap((d) => d.instances).map(instanceOf);
  const started = all.filter((i) => i.startMs <= now);
  const confirmed = started.filter((i) => records[i.id]?.confirmedAtMs != null).length;

  const edit = (i: PrayerInstance) => {
    if (i.startMs <= now) setEditing(i);
  };

  const editingAt = editing ? records[editing.id]?.confirmedAtMs : null;

  return (
    <Screen title="History">
      <Card style={{ gap: 4 }}>
        <T variant="label">LAST 7 DAYS</T>
        <T style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 42 }}>
          {confirmed} of {started.length}
        </T>
        <T color={t.muted}>prayers confirmed</T>
      </Card>

      <Card>
        <View style={styles.row}>
          <View style={styles.dateCol} />
          {PRAYERS.map((p) => (
            <T key={p} variant="small" style={styles.head}>
              {PRAYER_LABEL[p]}
            </T>
          ))}
        </View>
        {days.map((d) => (
          <View key={d.date} style={styles.row}>
            <T variant="small" style={styles.dateCol}>
              {new Date(`${d.date}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
              })}
            </T>
            {d.instances.map(instanceOf).map((i) => {
              const status = deriveStatus(i, records[i.id], now);
              const done = status === 'CONFIRMED';
              const missed = status === 'WINDOW_ENDED_UNCONFIRMED';
              return (
                <Pressable
                  key={i.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${PRAYER_LABEL[i.prayer]} ${d.date}: ${STATUS_SPOKEN[status]}`}
                  style={styles.cell}
                  onPress={() => edit(i)}>
                  <View
                    style={[
                      styles.mark,
                      { borderColor: t.border },
                      done && { backgroundColor: t.green, borderColor: t.green },
                      missed && { backgroundColor: t.border },
                      status === 'ACTIVE_UNCONFIRMED' && { borderColor: t.gold, borderWidth: 2 },
                    ]}>
                    {done ? <Icon name="check" size={15} color="#FFFFFF" width={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      <T variant="small" style={{ marginHorizontal: 4 }}>
        Tap any past prayer to correct it. This log is only what you reported: Kushu does not
        and cannot verify prayer, and it stays on your device.
      </T>
      {editing ? (
        <ActionSheet
          title={`${PRAYER_LABEL[editing.prayer]}, ${editing.date}`}
          message={
            editingAt != null
              ? `Confirmed at ${formatTime(editingAt, settings.timeFormat)}.`
              : 'Not confirmed.'
          }
          actions={[
            editingAt != null
              ? { label: 'Remove confirmation', onPress: () => correctAndReconcile(editing, false) }
              : { label: 'I did pray this', onPress: () => correctAndReconcile(editing, true) },
          ]}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  dateCol: { width: 58 },
  head: { flex: 1, textAlign: 'center', fontSize: 11 },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
