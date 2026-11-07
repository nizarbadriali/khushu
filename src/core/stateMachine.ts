import { PrayerInstance, PrayerRecord, PrayerRecords, PrayerStatus } from './types';

/**
 * Status is derived, never stored: time passing can only move a prayer to
 * ACTIVE or ENDED, and only a self-reported confirmation produces CONFIRMED.
 */
export function deriveStatus(
  instance: Pick<PrayerInstance, 'startMs' | 'cutoffMs'>,
  record: Pick<PrayerRecord, 'confirmedAtMs'> | undefined,
  nowMs: number,
): PrayerStatus {
  if (record?.confirmedAtMs != null) return 'CONFIRMED';
  if (nowMs < instance.startMs) return 'UPCOMING';
  if (nowMs < instance.cutoffMs) return 'ACTIVE_UNCONFIRMED';
  return 'WINDOW_ENDED_UNCONFIRMED';
}

export const isConfirmed = (records: PrayerRecords, id: string) =>
  records[id]?.confirmedAtMs != null;

const toRecord = (i: PrayerInstance, confirmedAtMs: number | null): PrayerRecord => ({
  id: i.id,
  prayer: i.prayer,
  date: i.date,
  startMs: i.startMs,
  cutoffMs: i.cutoffMs,
  confirmedAtMs,
});

/**
 * ACTIVE_UNCONFIRMED -> CONFIRMED. Idempotent: a repeat press keeps the first
 * timestamp and returns the same object, and other states are left untouched.
 */
export function confirmPrayer(
  records: PrayerRecords,
  instance: PrayerInstance,
  nowMs: number,
): PrayerRecords {
  const status = deriveStatus(instance, records[instance.id], nowMs);
  if (status !== 'ACTIVE_UNCONFIRMED') return records;
  return { ...records, [instance.id]: toRecord(instance, nowMs) };
}

/** User correction from History: undo an accidental press, or log a prayer afterwards. */
export function correctPrayer(
  records: PrayerRecords,
  instance: PrayerInstance,
  prayed: boolean,
  nowMs: number,
): PrayerRecords {
  if (nowMs < instance.startMs) return records;
  const confirmedAtMs = prayed ? (records[instance.id]?.confirmedAtMs ?? nowMs) : null;
  return { ...records, [instance.id]: toRecord(instance, confirmedAtMs) };
}

/** Records started prayers so History can show them; refreshes times, keeps confirmations. */
export function syncRecords(
  records: PrayerRecords,
  instances: PrayerInstance[],
  nowMs: number,
): PrayerRecords {
  let next = records;
  for (const i of instances) {
    if (i.startMs > nowMs) continue;
    const existing = records[i.id];
    if (existing && (existing.confirmedAtMs != null || existing.cutoffMs <= nowMs)) continue;
    if (existing?.startMs === i.startMs && existing?.cutoffMs === i.cutoffMs) continue;
    if (next === records) next = { ...records };
    next[i.id] = toRecord(i, null);
  }
  return next;
}
