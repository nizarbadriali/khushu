import { activeBlock, buildBlockWindows } from '../blockPlan';
import {
  confirmDemo,
  createDemo,
  demoBlock,
  demoPending,
  demoStatus,
  fastForward,
  setDemoInterval,
  startPrayer,
} from '../demoEngine';
import { hijriDate } from '../hijri';
import { activeInstance, computeDay, instancesAround, nextInstance } from '../prayerTimes';
import { buildReminderEvents, desiredEvents } from '../reminderPlan';
import { belongsToInstance, notificationId, reconcilePlan } from '../scheduler';
import { confirmPrayer, correctPrayer, deriveStatus, syncRecords } from '../stateMachine';
import {
  DEFAULT_SETTINGS,
  parseInterval,
  PrayerInstance,
  PrayerName,
  PrayerRecords,
  PrayerSettings,
} from '../types';

const MIN = 60_000;
const at = (h: number, m = 0) => new Date(2026, 10, 6, h, m).getTime();
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const instance = (prayer: PrayerName, startMs: number, cutoffMs: number): PrayerInstance => ({
  id: `2026-11-06_${prayer}`,
  prayer,
  date: '2026-11-06',
  startMs,
  cutoffMs,
});

const settings = (over: Partial<PrayerSettings> = {}): PrayerSettings => ({
  ...DEFAULT_SETTINGS.prayers.dhuhr,
  ...over,
});

const pendingAfter = (i: PrayerInstance, s: PrayerSettings, records: PrayerRecords, now: number) =>
  desiredEvents([i], records, () => s, now, 500);

describe('Test A: recurring reminders', () => {
  const events = buildReminderEvents(instance('dhuhr', at(13), at(15)), settings());

  it('starts at 1:00 and reminds at 1:30, 2:00, 2:30', () => {
    expect(events.map((e) => hhmm(e.atMs))).toEqual(['13:00', '13:30', '14:00', '14:30']);
    expect(events[0].kind).toBe('start');
  });

  it('merges the end warning into the 2:30 reminder rather than duplicating it', () => {
    expect(events.filter((e) => hhmm(e.atMs) === '14:30')).toHaveLength(1);
    expect(events[3].kind).toBe('reminderFinal');
  });

  it('schedules nothing at or after the cutoff', () => {
    expect(events.every((e) => e.atMs < at(15))).toBe(true);
  });
});

describe('Test B: early confirmation', () => {
  const dhuhr = instance('dhuhr', at(13), at(15));
  const records = confirmPrayer({}, dhuhr, at(13, 12));

  it('becomes confirmed and records the timestamp', () => {
    expect(deriveStatus(dhuhr, records[dhuhr.id], at(13, 12))).toBe('CONFIRMED');
    expect(records[dhuhr.id].confirmedAtMs).toBe(at(13, 12));
  });

  it('leaves no further reminders', () => {
    expect(pendingAfter(dhuhr, settings(), records, at(13, 12))).toEqual([]);
  });

  it('removes the block window', () => {
    const s = settings({ lockEnabled: true });
    expect(buildBlockWindows([dhuhr], {}, () => s, true, at(13, 5))).toHaveLength(1);
    expect(buildBlockWindows([dhuhr], records, () => s, true, at(13, 12))).toEqual([]);
  });

  it('is idempotent on a repeat press', () => {
    expect(confirmPrayer(records, dhuhr, at(13, 13))).toBe(records);
  });
});

describe('Test C: custom interval', () => {
  const maghrib = instance('maghrib', at(18), at(18, 45));
  const s = settings({ intervalMin: 10 });
  const events = buildReminderEvents(maghrib, s);

  it('produces reminders plus a distinct end warning at 6:15', () => {
    expect(events.map((e) => `${hhmm(e.atMs)} ${e.kind}`)).toEqual([
      '18:00 start',
      '18:10 reminder',
      '18:15 final',
      '18:20 reminder',
      '18:30 reminder',
      '18:40 reminder',
    ]);
  });

  it('clears everything outstanding after confirmation', () => {
    const records = confirmPrayer({}, maghrib, at(18, 5));
    expect(pendingAfter(maghrib, s, records, at(18, 5))).toEqual([]);
  });
});

describe('Test D: settings change', () => {
  const dhuhr = instance('dhuhr', at(13), at(15));
  const channel = () => 'ch';
  const now = at(13, 5);

  it('replaces old reminders with no duplicates', () => {
    const before = pendingAfter(dhuhr, settings(), {}, now);
    const pending = before.map((e) => notificationId(e, 'ch'));
    const after = pendingAfter(dhuhr, settings({ intervalMin: 15 }), {}, now);
    const plan = reconcilePlan(pending, after, channel);

    const result = pending.filter((id) => !plan.cancel.includes(id));
    result.push(...plan.schedule.map((x) => x.id));

    expect(new Set(result).size).toBe(result.length);
    expect(result.sort()).toEqual(after.map((e) => notificationId(e, 'ch')).sort());
    expect(after.map((e) => hhmm(e.atMs))).toEqual([
      '13:15',
      '13:30',
      '13:45',
      '14:00',
      '14:15',
      '14:30',
      '14:45',
    ]);
  });

  it('is a no-op when nothing changed', () => {
    const desired = pendingAfter(dhuhr, settings(), {}, now);
    const plan = reconcilePlan(desired.map((e) => notificationId(e, 'ch')), desired, channel);
    expect(plan).toEqual({ cancel: [], schedule: [] });
  });

  it('preserves an existing confirmation', () => {
    const records = confirmPrayer({}, dhuhr, now);
    expect(pendingAfter(dhuhr, settings({ intervalMin: 15 }), records, now)).toEqual([]);
    expect(records[dhuhr.id].confirmedAtMs).toBe(now);
  });

  it('never cancels notifications it does not own', () => {
    expect(reconcilePlan(['someone-else'], [], channel).cancel).toEqual([]);
  });

  it('scopes cancellation to one prayer', () => {
    expect(belongsToInstance('sl|2026-11-06_asr|start|1|ch', '2026-11-06_asr')).toBe(true);
    expect(belongsToInstance('sl|2026-11-06_asr|start|1|ch', '2026-11-06_isha')).toBe(false);
  });
});

describe('Test E: app-blocking expiration', () => {
  const asr = instance('asr', at(15), at(17));
  const s = settings({ lockEnabled: true });
  const windows = buildBlockWindows([asr], {}, () => s, true, at(15, 30));

  it('ends the block at the cutoff without a confirmation', () => {
    expect(activeBlock(windows, at(16, 59))?.id).toBe(asr.id);
    expect(activeBlock(windows, at(17))).toBeNull();
  });

  it('marks the prayer unconfirmed, never completed', () => {
    expect(deriveStatus(asr, undefined, at(17))).toBe('WINDOW_ENDED_UNCONFIRMED');
  });

  it('never applies a block retroactively', () => {
    expect(buildBlockWindows([asr], {}, () => s, true, at(17, 1))).toEqual([]);
  });

  it('skips an activation that would land after the cutoff', () => {
    const late = settings({ lockEnabled: true, lockStart: 'grace', graceMin: 500 });
    expect(buildBlockWindows([asr], {}, () => late, true, at(15))).toEqual([]);
  });

  it('honours the activation timing options', () => {
    const after = settings({ lockEnabled: true, lockStart: 'afterFirstReminder', intervalMin: 20 });
    expect(buildBlockWindows([asr], {}, () => after, true, at(15))[0].startMs).toBe(at(15, 20));
  });

  it('produces nothing when Kushu Mode is off', () => {
    expect(buildBlockWindows([asr], {}, () => s, false, at(15))).toEqual([]);
  });
});

describe('Test F: Demo Mode', () => {
  it('runs the full cycle through production logic on a simulated clock', () => {
    const realRecords: PrayerRecords = Object.freeze({});
    let d = createDemo(at(10));
    expect(demoStatus(d)).toBe('UPCOMING');

    d = startPrayer(d);
    expect(demoStatus(d)).toBe('ACTIVE_UNCONFIRMED');
    expect(d.fired.map((e) => e.kind)).toEqual(['start']);
    expect(demoBlock(d)).not.toBeNull();

    d = setDemoInterval(d, 10);
    const startedAt = d.simNowMs;
    d = fastForward(d);
    expect(d.simNowMs - startedAt).toBe(10 * MIN);
    expect(d.fired.map((e) => e.kind)).toEqual(['start', 'reminder']);

    d = confirmDemo(d);
    expect(demoStatus(d)).toBe('CONFIRMED');
    expect(demoPending(d)).toEqual([]);
    expect(demoBlock(d)).toBeNull();
    expect(realRecords).toEqual({});
  });
});

describe('edge cases', () => {
  it('skips a warning that cannot fit in a short window', () => {
    const events = buildReminderEvents(instance('maghrib', at(18), at(18, 20)), settings());
    expect(events.map((e) => e.kind)).toEqual(['start']);
  });

  it('honours a custom warning lead', () => {
    const i = instance('asr', at(15), at(16));
    const events = buildReminderEvents(i, settings({ intervalMin: 25, warningLeadMin: 5 }));
    expect(events.find((e) => e.kind === 'final')?.atMs).toBe(at(15, 55));
  });

  it('returns nothing for an inverted window', () => {
    expect(buildReminderEvents(instance('isha', at(20), at(19)), settings())).toEqual([]);
  });

  it('caps pending notifications to the earliest events', () => {
    const i = instance('dhuhr', at(13), at(15));
    const out = desiredEvents([i], {}, () => settings({ intervalMin: 5 }), at(12), 3);
    expect(out.map((e) => hhmm(e.atMs))).toEqual(['13:00', '13:05', '13:10']);
  });

  it('does not schedule a disabled prayer', () => {
    const i = instance('dhuhr', at(13), at(15));
    expect(desiredEvents([i], {}, () => settings({ enabled: false }), at(12), 50)).toEqual([]);
  });

  it('does not confirm a prayer that has not started or has ended', () => {
    const i = instance('asr', at(15), at(17));
    expect(confirmPrayer({}, i, at(14))).toEqual({});
    expect(confirmPrayer({}, i, at(17))).toEqual({});
  });

  it('keeps each prayer independent', () => {
    const dhuhr = instance('dhuhr', at(13), at(15));
    const asr = instance('asr', at(15), at(17));
    const records = confirmPrayer({}, dhuhr, at(14));
    expect(deriveStatus(asr, records[asr.id], at(15, 30))).toBe('ACTIVE_UNCONFIRMED');
  });

  it('corrects an accidental confirmation and restores reminders', () => {
    const i = instance('asr', at(15), at(17));
    const undone = correctPrayer(confirmPrayer({}, i, at(15, 1)), i, false, at(15, 2));
    expect(deriveStatus(i, undone[i.id], at(15, 2))).toBe('ACTIVE_UNCONFIRMED');
    expect(pendingAfter(i, settings(), undone, at(15, 2)).length).toBeGreaterThan(0);
  });

  it('logs a prayer after the window via correction', () => {
    const i = instance('asr', at(15), at(17));
    const out = correctPrayer({}, i, true, at(18));
    expect(deriveStatus(i, out[i.id], at(18))).toBe('CONFIRMED');
  });

  it('syncRecords keeps confirmations across a recalculation', () => {
    const i = instance('asr', at(15), at(17));
    const records = confirmPrayer({}, i, at(15, 5));
    const moved = { ...i, startMs: at(15, 3) };
    expect(syncRecords(records, [moved], at(15, 10))[i.id].confirmedAtMs).toBe(at(15, 5));
  });

  it('syncRecords adds started prayers and skips upcoming ones', () => {
    const started = instance('dhuhr', at(13), at(15));
    const later = instance('asr', at(15), at(17));
    expect(Object.keys(syncRecords({}, [started, later], at(14)))).toEqual([started.id]);
  });

  it('validates custom intervals', () => {
    expect(parseInterval('25')).toBe(25);
    expect(parseInterval(' 7 ')).toBe(7);
    for (const bad of ['0', '-5', '1.5', 'abc', '', '241']) expect(parseInterval(bad)).toBeNull();
  });
});

describe('prayer time calculation', () => {
  const nyc = {
    location: { latitude: 40.7128, longitude: -74.006 },
    method: 'NorthAmerica',
    asr: 'standard' as const,
    ishaCutoff: 'midnight' as const,
  };

  it('orders the day and chains each cutoff to the next boundary', () => {
    const [fajr, dhuhr, asr, maghrib, isha] = computeDay(new Date(2026, 10, 6), nyc).instances;
    expect(fajr.startMs).toBeLessThan(fajr.cutoffMs);
    expect(fajr.cutoffMs).toBeLessThan(dhuhr.startMs);
    expect(dhuhr.cutoffMs).toBe(asr.startMs);
    expect(asr.cutoffMs).toBe(maghrib.startMs);
    expect(maghrib.cutoffMs).toBe(isha.startMs);
  });

  it('crosses midnight when Isha runs to the next Fajr', () => {
    const opts = { ...nyc, ishaCutoff: 'fajr' as const };
    const today = computeDay(new Date(2026, 10, 6), opts).instances;
    const tomorrow = computeDay(new Date(2026, 10, 7), opts).instances;
    expect(today[4].cutoffMs).toBe(tomorrow[0].startMs);
  });

  it('finds yesterday Isha as active just after midnight', () => {
    const opts = { ...nyc, ishaCutoff: 'fajr' as const };
    const now = new Date(2026, 10, 7, 1, 0).getTime();
    const active = activeInstance(instancesAround(now, opts, 1), now);
    expect(active?.prayer).toBe('isha');
    expect(active?.date).toBe('2026-11-06');
  });

  it('gives a later Asr under the Hanafi preference', () => {
    const day = new Date(2026, 10, 6);
    const standard = computeDay(day, nyc).instances[2].startMs;
    const hanafi = computeDay(day, { ...nyc, asr: 'hanafi' }).instances[2].startMs;
    expect(hanafi).toBeGreaterThan(standard);
  });

  it('rolls over to tomorrow Fajr once the day is finished', () => {
    const now = new Date(2026, 10, 6, 23, 30).getTime();
    expect(nextInstance(instancesAround(now, nyc, 1), now)?.id).toBe('2026-11-07_fajr');
  });

  it('keeps dates distinct across a DST change', () => {
    const now = new Date(2026, 2, 7, 12).getTime();
    const ids = instancesAround(now, nyc, 3).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('survives a high-latitude location', () => {
    const tromso = { ...nyc, location: { latitude: 69.65, longitude: 18.96 } };
    const { instances } = computeDay(new Date(2026, 5, 21), tromso);
    expect(instances).toHaveLength(5);
    instances.forEach((i) => expect(buildReminderEvents(i, settings())).toBeDefined());
  });
});

describe('hijri date', () => {
  it('matches a known conversion within the tabular margin', () => {
    const h = hijriDate(new Date(2024, 2, 11));
    expect(h.month === 'Ramadan' || h.month === 'Shaban').toBe(true);
    expect(h.year).toBe(1445);
  });
});
