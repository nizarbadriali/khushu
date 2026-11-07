import { isConfirmed } from './stateMachine';
import { PrayerInstance, PrayerName, PrayerRecords, PrayerSettings } from './types';

const MINUTE = 60_000;

/** `final` is the end-of-window warning; `reminderFinal` is a reminder merged with it. */
export type ReminderKind = 'start' | 'reminder' | 'final' | 'reminderFinal';

export interface ReminderEvent {
  instanceId: string;
  prayer: PrayerName;
  date: string;
  kind: ReminderKind;
  atMs: number;
}

/** The complete, time-independent reminder timeline for one prayer. */
export function buildReminderEvents(
  instance: PrayerInstance,
  s: Pick<PrayerSettings, 'intervalMin' | 'warningEnabled' | 'warningLeadMin'>,
): ReminderEvent[] {
  const { startMs, cutoffMs } = instance;
  if (cutoffMs <= startMs) return [];

  const event = (kind: ReminderKind, atMs: number): ReminderEvent => ({
    instanceId: instance.id,
    prayer: instance.prayer,
    date: instance.date,
    kind,
    atMs,
  });

  const events = [event('start', startMs)];
  const step = Math.max(1, s.intervalMin) * MINUTE;
  for (let at = startMs + step; at < cutoffMs; at += step) {
    events.push(event('reminder', at));
  }

  if (s.warningEnabled && s.warningLeadMin > 0) {
    const warnAt = cutoffMs - s.warningLeadMin * MINUTE;
    // A warning at or before the start cannot say anything the start did not.
    if (warnAt > startMs) {
      const twin = events.find((e) => e.kind === 'reminder' && Math.abs(e.atMs - warnAt) < MINUTE);
      if (twin) twin.kind = 'reminderFinal';
      else events.push(event('final', warnAt));
    }
  }
  return events.sort((a, b) => a.atMs - b.atMs);
}

/** Everything that should be pending right now, earliest first, capped to the OS budget. */
export function desiredEvents(
  instances: PrayerInstance[],
  records: PrayerRecords,
  settingsFor: (prayer: PrayerName) => PrayerSettings,
  nowMs: number,
  maxPending: number,
): ReminderEvent[] {
  return instances
    .filter((i) => settingsFor(i.prayer).enabled && !isConfirmed(records, i.id))
    .flatMap((i) => buildReminderEvents(i, settingsFor(i.prayer)))
    .filter((e) => e.atMs > nowMs)
    .sort((a, b) => a.atMs - b.atMs)
    .slice(0, maxPending);
}

export function reminderCopy(kind: ReminderKind, label: string) {
  switch (kind) {
    case 'start':
      return { title: `It's time for ${label}`, body: 'Take a moment for Salah.' };
    case 'final':
    case 'reminderFinal':
      return {
        title: `${label} is ending soon`,
        body: `${label}'s prayer window is approaching its end. Have you prayed?`,
      };
    default:
      return { title: `Have you prayed ${label}?`, body: 'Tap to confirm when you have.' };
  }
}
