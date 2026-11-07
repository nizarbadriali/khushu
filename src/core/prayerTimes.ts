import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  SunnahTimes,
} from 'adhan';

import { AppLocation, AsrPreference, IshaCutoff, PRAYERS, PrayerInstance } from './types';

export const CALCULATION_METHODS: { id: string; label: string }[] = [
  { id: 'NorthAmerica', label: 'ISNA (North America)' },
  { id: 'MuslimWorldLeague', label: 'Muslim World League' },
  { id: 'Egyptian', label: 'Egyptian General Authority' },
  { id: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
  { id: 'UmmAlQura', label: 'Umm al-Qura, Makkah' },
  { id: 'Dubai', label: 'Dubai' },
  { id: 'Kuwait', label: 'Kuwait' },
  { id: 'Qatar', label: 'Qatar' },
  { id: 'Singapore', label: 'Singapore' },
  { id: 'Tehran', label: 'Tehran' },
  { id: 'Turkey', label: 'Diyanet, Turkey' },
  { id: 'MoonsightingCommittee', label: 'Moonsighting Committee' },
];

export interface CalcOptions {
  location: Pick<AppLocation, 'latitude' | 'longitude'>;
  method: string;
  asr: AsrPreference;
  ishaCutoff: IshaCutoff;
}

export interface DaySchedule {
  date: string;
  sunriseMs: number;
  instances: PrayerInstance[];
}

export function localDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Calendar arithmetic, so a 23 or 25 hour DST day cannot skip or repeat a date. */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function parameters(opts: CalcOptions, coords: Coordinates): CalculationParameters {
  const factory =
    (CalculationMethod as unknown as Record<string, () => CalculationParameters>)[opts.method] ??
    CalculationMethod.MuslimWorldLeague;
  const params = factory();
  params.madhab = opts.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.recommended(coords);
  return params;
}

export function computeDay(day: Date, opts: CalcOptions): DaySchedule {
  const coords = new Coordinates(opts.location.latitude, opts.location.longitude);
  const params = parameters(opts, coords);
  const date = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const times = new PrayerTimes(coords, date, params);
  const nextFajr = new PrayerTimes(coords, addDays(date, 1), params).fajr;
  const ishaEnd =
    opts.ishaCutoff === 'fajr' ? nextFajr : new SunnahTimes(times).middleOfTheNight;

  const key = localDateKey(date);
  const starts = [times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha];
  const cutoffs = [times.sunrise, times.asr, times.maghrib, times.isha, ishaEnd];

  return {
    date: key,
    sunriseMs: times.sunrise.getTime(),
    instances: PRAYERS.map((prayer, i) => ({
      id: `${key}_${prayer}`,
      prayer,
      date: key,
      startMs: starts[i].getTime(),
      cutoffMs: cutoffs[i].getTime(),
    })),
  };
}

/** Instances from yesterday (Isha can cross midnight) through `daysAhead` days out. */
export function instancesAround(
  nowMs: number,
  opts: CalcOptions,
  daysAhead: number,
): PrayerInstance[] {
  const today = new Date(nowMs);
  const out: PrayerInstance[] = [];
  for (let i = -1; i <= daysAhead; i++) {
    out.push(...computeDay(addDays(today, i), opts).instances);
  }
  return out;
}

export function activeInstance(instances: PrayerInstance[], nowMs: number): PrayerInstance | null {
  return instances.find((p) => nowMs >= p.startMs && nowMs < p.cutoffMs) ?? null;
}

export function nextInstance(instances: PrayerInstance[], nowMs: number): PrayerInstance | null {
  return (
    instances.filter((p) => p.startMs > nowMs).sort((a, b) => a.startMs - b.startMs)[0] ?? null
  );
}
