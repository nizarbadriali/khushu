import { formatTime } from './format';
import { activeInstance, localDateKey, nextInstance } from './prayerTimes';
import { deriveStatus, isConfirmed } from './stateMachine';
import { PRAYER_LABEL, PrayerInstance, PrayerName, PrayerRecords } from './types';

/** Opens the prayer dashboard. Expo Router maps the bare scheme to the Home route. */
export const DASHBOARD_URL = 'kushu://';

export interface WidgetPrayerRow {
  prayer: PrayerName;
  label: string;
  timeLabel: string;
  done: boolean;
  isNext: boolean;
}

export interface WidgetNextPrayer {
  id: string;
  label: string;
  startMs: number;
  timeLabel: string;
  /** The prayer falls on the following calendar day, as Fajr does after Isha. */
  tomorrow: boolean;
}

/**
 * Everything a widget draws. It is plain serializable data because widgets run in an
 * isolated runtime that cannot reach the store, hooks or the prayer engine.
 */
export interface WidgetSnapshot {
  atMs: number;
  dateLabel: string;
  /** Null once the schedule runs out, so a widget asks for the app rather than show old data. */
  next: WidgetNextPrayer | null;
  rows: WidgetPrayerRow[];
  completed: number;
  total: number;
  countdown: boolean;
  /** Set while a prayer is open and unconfirmed, for example "Fajr ends at sunrise, 6:29 AM". */
  windowNote: string | null;
  url: string;
}

export interface SnapshotOptions {
  timeFormat: '12h' | '24h';
  countdown: boolean;
}

function windowNote(
  instances: PrayerInstance[],
  records: PrayerRecords,
  format: SnapshotOptions['timeFormat'],
  atMs: number,
): string | null {
  const active = activeInstance(instances, atMs);
  if (!active || deriveStatus(active, records[active.id], atMs) !== 'ACTIVE_UNCONFIRMED') {
    return null;
  }
  const end = formatTime(active.cutoffMs, format);
  return active.prayer === 'fajr'
    ? `Fajr ends at sunrise, ${end}`
    : `${PRAYER_LABEL[active.prayer]} ends at ${end}`;
}

export function buildWidgetSnapshot(
  instances: PrayerInstance[],
  records: PrayerRecords,
  options: SnapshotOptions,
  atMs: number,
): WidgetSnapshot {
  const at = new Date(atMs);
  const dayKey = localDateKey(at);
  const next = nextInstance(instances, atMs);
  const time = (ms: number) => formatTime(ms, options.timeFormat);
  const today = instances
    .filter((i) => i.date === dayKey)
    .sort((a, b) => a.startMs - b.startMs);

  const rows = today.map((i) => ({
    prayer: i.prayer,
    label: PRAYER_LABEL[i.prayer],
    timeLabel: time(i.startMs),
    done: isConfirmed(records, i.id),
    isNext: i.id === next?.id,
  }));

  return {
    atMs,
    dateLabel: at.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    next: next && {
      id: next.id,
      label: PRAYER_LABEL[next.prayer],
      startMs: next.startMs,
      timeLabel: time(next.startMs),
      tomorrow: next.date !== dayKey,
    },
    rows,
    completed: rows.filter((r) => r.done).length,
    total: rows.length,
    countdown: options.countdown,
    windowNote: windowNote(instances, records, options.timeFormat, atMs),
    url: DASHBOARD_URL,
  };
}

export interface TimelineEntry {
  atMs: number;
  props: WidgetSnapshot;
}

/**
 * Precomputes the widget for every moment its content changes, so WidgetKit can move
 * through the day with the app closed. Confirmations made later arrive with a new timeline.
 */
export function buildWidgetTimeline(
  instances: PrayerInstance[],
  records: PrayerRecords,
  options: SnapshotOptions,
  nowMs: number,
): TimelineEntry[] {
  const lastMs = Math.max(nowMs, ...instances.map((i) => i.startMs));
  const moments = new Set<number>([nowMs]);

  for (const i of instances) {
    if (i.startMs > nowMs) moments.add(i.startMs);
    if (i.cutoffMs > nowMs && i.cutoffMs <= lastMs) moments.add(i.cutoffMs);
  }

  // Calendar arithmetic, so a 23 or 25 hour DST day still lands on midnight.
  const d = new Date(nowMs);
  for (let day = 1; ; day++) {
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + day).getTime();
    if (midnight > lastMs) break;
    moments.add(midnight);
  }

  return [...moments]
    .sort((a, b) => a - b)
    .map((atMs) => ({ atMs, props: buildWidgetSnapshot(instances, records, options, atMs) }));
}

const SHORT_LABEL: Record<string, string> = { Maghrib: 'Mgrb', Dhuhr: 'Dhr' };

export interface LiveActivityProps {
  prayerId: string;
  label: string;
  shortLabel: string;
  timeLabel: string;
  startMs: number;
  fromMs: number;
  progress: string;
  tomorrow: boolean;
}

export function buildActivityProps(snapshot: WidgetSnapshot): LiveActivityProps | null {
  const { next } = snapshot;
  if (!next) return null;
  return {
    prayerId: next.id,
    label: next.label,
    shortLabel: SHORT_LABEL[next.label] ?? next.label,
    timeLabel: next.timeLabel,
    startMs: next.startMs,
    fromMs: snapshot.atMs,
    progress: `${snapshot.completed} of ${snapshot.total} today`,
    tomorrow: next.tomorrow,
  };
}

export interface ActivityPlan {
  /** Duplicates or activities that should not exist. */
  end: string[];
  /** The one activity to keep, when there is one. */
  keep: string | null;
  update: boolean;
  start: boolean;
}

/** `fromMs` moves on every run, so it must not count as a change in content. */
export const activityKey = (p: LiveActivityProps) => {
  const { fromMs: _fromMs, ...content } = p;
  return JSON.stringify(content);
};

/**
 * Decides how to make the system match what should be showing. The app can only act
 * while it runs, so this is applied on every launch and resume.
 *
 * An activity missing for a prayer it was already started for was dismissed by the
 * user, or expired. Starting it again would override a dismissal, so the next
 * prayer gets a fresh one instead.
 */
export function planLiveActivity(input: {
  enabled: boolean;
  desired: LiveActivityProps | null;
  existingIds: string[];
  lastPrayerId: string | null;
  lastKey: string | null;
}): ActivityPlan {
  const { enabled, desired, existingIds, lastPrayerId, lastKey } = input;
  if (!enabled || !desired) {
    return { end: existingIds, keep: null, update: false, start: false };
  }
  const [keep, ...duplicates] = existingIds;
  if (keep) {
    return {
      end: duplicates,
      keep,
      update: activityKey(desired) !== lastKey,
      start: false,
    };
  }
  return { end: [], keep: null, update: false, start: desired.prayerId !== lastPrayerId };
}

export interface CountdownEntry {
  label: string;
  timeLabel: string;
  startMs: number;
}

/** Upcoming prayers for the Android countdown, which walks this list by itself. */
export function buildCountdownPlan(
  instances: PrayerInstance[],
  format: SnapshotOptions['timeFormat'],
  nowMs: number,
): CountdownEntry[] {
  return instances
    .filter((i) => i.startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs)
    .map((i) => ({
      label: PRAYER_LABEL[i.prayer],
      timeLabel: formatTime(i.startMs, format),
      startMs: i.startMs,
    }));
}
