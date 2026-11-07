export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = (typeof PRAYERS)[number];

export const PRAYER_LABEL: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

/** One prayer on one local date. Timestamps are absolute epoch milliseconds. */
export interface PrayerInstance {
  /** `${localDate}_${prayer}`, e.g. 2026-11-06_asr. Stable across recalculation. */
  id: string;
  prayer: PrayerName;
  /** Local calendar date the prayer STARTS on (YYYY-MM-DD). */
  date: string;
  startMs: number;
  cutoffMs: number;
}

export type PrayerStatus =
  | 'UPCOMING'
  | 'ACTIVE_UNCONFIRMED'
  | 'CONFIRMED'
  | 'WINDOW_ENDED_UNCONFIRMED';

/** Persisted, self-reported record. The app never verifies that prayer occurred. */
export interface PrayerRecord {
  id: string;
  prayer: PrayerName;
  date: string;
  startMs: number;
  cutoffMs: number;
  confirmedAtMs: number | null;
}
export type PrayerRecords = Record<string, PrayerRecord>;

export type LockStart = 'immediate' | 'afterFirstReminder' | 'grace';

export interface PrayerSettings {
  enabled: boolean;
  intervalMin: number;
  adhan: boolean;
  warningEnabled: boolean;
  warningLeadMin: number;
  lockEnabled: boolean;
  lockStart: LockStart;
  graceMin: number;
}

export type AsrPreference = 'standard' | 'hanafi';
export type IshaCutoff = 'midnight' | 'fajr';
export type SoundChoice = 'adhan' | 'chime' | 'system';

export interface AppLocation {
  latitude: number;
  longitude: number;
  label: string;
  source: 'gps' | 'manual';
}

export interface LockedApp {
  packageName: string;
  label: string;
}

export interface AppSettings {
  location: AppLocation | null;
  method: string;
  asr: AsrPreference;
  ishaCutoff: IshaCutoff;
  notificationsEnabled: boolean;
  adhanEnabled: boolean;
  sound: SoundChoice;
  vibrate: boolean;
  timeFormat: '12h' | '24h';
  appearance: 'system' | 'light' | 'dark';
  lockEnabled: boolean;
  lockedApps: LockedApp[];
  liveActivityEnabled: boolean;
  countdownEnabled: boolean;
  prayers: Record<PrayerName, PrayerSettings>;
}

const prayerDefaults = (intervalMin: number): PrayerSettings => ({
  enabled: true,
  intervalMin,
  adhan: true,
  warningEnabled: true,
  warningLeadMin: 30,
  lockEnabled: false,
  lockStart: 'immediate',
  graceMin: 10,
});

export const DEFAULT_SETTINGS: AppSettings = {
  location: null,
  method: 'NorthAmerica',
  asr: 'standard',
  ishaCutoff: 'midnight',
  notificationsEnabled: true,
  adhanEnabled: true,
  sound: 'adhan',
  vibrate: true,
  timeFormat: '12h',
  appearance: 'system',
  lockEnabled: false,
  lockedApps: [],
  liveActivityEnabled: true,
  countdownEnabled: true,
  prayers: {
    fajr: prayerDefaults(15),
    dhuhr: prayerDefaults(30),
    asr: prayerDefaults(30),
    maghrib: prayerDefaults(10),
    isha: prayerDefaults(30),
  },
};

export const INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
export const MIN_INTERVAL = 1;
export const MAX_INTERVAL = 240;

/** Returns a valid interval or null if the custom input is unusable. */
export function parseInterval(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const n = Number(input.trim());
  return n >= MIN_INTERVAL && n <= MAX_INTERVAL ? n : null;
}
