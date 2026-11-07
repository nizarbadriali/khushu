import { isConfirmed } from './stateMachine';
import { PrayerInstance, PrayerName, PrayerRecords, PrayerSettings } from './types';

const MINUTE = 60_000;

export interface BlockWindow {
  id: string;
  prayer: PrayerName;
  startMs: number;
  endMs: number;
}

export function blockStartMs(instance: PrayerInstance, s: PrayerSettings): number {
  switch (s.lockStart) {
    case 'afterFirstReminder':
      return instance.startMs + s.intervalMin * MINUTE;
    case 'grace':
      return instance.startMs + s.graceMin * MINUTE;
    default:
      return instance.startMs;
  }
}

/**
 * Every window ends at the prayer cutoff and native code enforces that end time
 * itself. Ended prayers are dropped, so restrictions are never retroactive.
 */
export function buildBlockWindows(
  instances: PrayerInstance[],
  records: PrayerRecords,
  settingsFor: (prayer: PrayerName) => PrayerSettings,
  lockEnabled: boolean,
  nowMs: number,
): BlockWindow[] {
  if (!lockEnabled) return [];
  return instances.flatMap((i) => {
    const s = settingsFor(i.prayer);
    if (!s.lockEnabled || isConfirmed(records, i.id) || i.cutoffMs <= nowMs) return [];
    const startMs = blockStartMs(i, s);
    return startMs < i.cutoffMs ? [{ id: i.id, prayer: i.prayer, startMs, endMs: i.cutoffMs }] : [];
  });
}

export const activeBlock = (windows: BlockWindow[], nowMs: number) =>
  windows.find((w) => nowMs >= w.startMs && nowMs < w.endMs) ?? null;
