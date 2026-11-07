import { activeBlock, buildBlockWindows } from '../blockPlan';
import { createDemo, deferDemo, demoBlock, demoPending, demoStatus, startPrayer } from '../demoEngine';
import { clearDeferral, deferPrompt, isPromptCollapsed, nextReminderAt } from '../notYet';
import { computeDay } from '../prayerTimes';
import { desiredEvents } from '../reminderPlan';
import { notificationId, reconcilePlan } from '../scheduler';
import { confirmPrayer, deriveStatus } from '../stateMachine';
import { DEFAULT_SETTINGS, PrayerInstance, PrayerRecords, PrayerSettings } from '../types';

const MIN = 60_000;
const at = (h: number, m = 0) => new Date(2026, 10, 6, h, m).getTime();

const asr: PrayerInstance = {
  id: '2026-11-06_asr',
  prayer: 'asr',
  date: '2026-11-06',
  startMs: at(15),
  cutoffMs: at(17),
};
const settings: PrayerSettings = {
  ...DEFAULT_SETTINGS.prayers.asr,
  intervalMin: 30,
  lockEnabled: true,
};
const pending = (records: PrayerRecords, now: number) =>
  desiredEvents([asr], records, () => settings, now, 500);
const windows = (records: PrayerRecords, now: number) =>
  buildBlockWindows([asr], records, () => settings, true, now);

describe('Not Yet', () => {
  const now = at(15, 1);
  const records: PrayerRecords = {};
  const next = nextReminderAt(asr, settings, true, now);
  const deferrals = deferPrompt({}, asr, next, now);

  it('A: leaves the prayer unconfirmed', () => {
    expect(deriveStatus(asr, records[asr.id], now)).toBe('ACTIVE_UNCONFIRMED');
  });

  it('B: keeps every future reminder, so the next one is still 3:30', () => {
    expect(next).toBe(at(15, 30));
    expect(pending(records, now).map((e) => e.atMs)).toContain(at(15, 30));
    expect(pending(records, now).length).toBeGreaterThan(0);
  });

  it('B: asks the OS to change nothing, which rules out duplicates', () => {
    const channel = () => 'c';
    const scheduled = pending(records, now).map((e) => notificationId(e, channel()));
    const plan = reconcilePlan(scheduled, pending(records, now), channel);
    expect(plan).toEqual({ cancel: [], schedule: [] });
  });

  it('C: leaves an active restriction in place', () => {
    expect(activeBlock(windows(records, now), now)?.id).toBe(asr.id);
  });

  it('collapses the prompt until the next reminder, then expands it again', () => {
    expect(isPromptCollapsed(deferrals, asr.id, at(15, 29))).toBe(true);
    expect(isPromptCollapsed(deferrals, asr.id, at(15, 30))).toBe(false);
  });

  it('pressing it twice before a reminder changes nothing', () => {
    expect(deferPrompt(deferrals, asr, next, at(15, 5))).toEqual(deferrals);
  });

  it('stays collapsed until the cutoff when no reminders remain', () => {
    const late = at(16, 59);
    const none = nextReminderAt(asr, settings, true, late);
    expect(none).toBeNull();
    const d = deferPrompt({}, asr, none, late);
    expect(d[asr.id]).toBe(asr.cutoffMs);
  });

  it('reports no reminder when notifications or this prayer are off', () => {
    expect(nextReminderAt(asr, settings, false, now)).toBeNull();
    expect(nextReminderAt(asr, { ...settings, enabled: false }, true, now)).toBeNull();
  });

  it('allows confirming later, which clears the deferral', () => {
    const later = confirmPrayer(records, asr, at(15, 10));
    expect(deriveStatus(asr, later[asr.id], at(15, 10))).toBe('CONFIRMED');
    expect(clearDeferral(deferrals, asr.id)).toEqual({});
  });

  it('drops expired deferrals rather than growing forever', () => {
    const old = { '2026-11-05_asr': at(9) };
    expect(Object.keys(deferPrompt(old, asr, next, now))).toEqual([asr.id]);
  });
});

describe('Yes and Not Yet produce different transitions', () => {
  const now = at(15, 1);
  const confirmed = confirmPrayer({}, asr, now);

  it('D: Yes confirms, cancels the remaining reminders and releases the restriction', () => {
    expect(deriveStatus(asr, confirmed[asr.id], now)).toBe('CONFIRMED');
    expect(pending(confirmed, now)).toEqual([]);
    expect(windows(confirmed, now)).toEqual([]);
  });

  it('D: Yes turns into real cancellations for everything already scheduled', () => {
    const channel = () => 'c';
    const scheduled = pending({}, now).map((e) => notificationId(e, channel()));
    const plan = reconcilePlan(scheduled, pending(confirmed, now), channel);
    expect(plan.cancel).toEqual(scheduled);
    expect(plan.schedule).toEqual([]);
  });

  it('the same moment yields opposite outcomes', () => {
    expect(pending({}, now).length).toBeGreaterThan(0);
    expect(pending(confirmed, now).length).toBe(0);
    expect(activeBlock(windows({}, now), now)).not.toBeNull();
    expect(activeBlock(windows(confirmed, now), now)).toBeNull();
  });
});

describe('Fajr ends at sunrise', () => {
  const opts = {
    location: { latitude: 34.05, longitude: -118.24 },
    method: 'NorthAmerica',
    asr: 'standard' as const,
    ishaCutoff: 'midnight' as const,
  };
  const day = computeDay(new Date(2026, 10, 6), opts);
  const fajr = day.instances[0];
  const s = { ...DEFAULT_SETTINGS.prayers.fajr, lockEnabled: true };

  it('uses sunrise as the cutoff', () => {
    expect(fajr.cutoffMs).toBe(day.sunriseMs);
  });

  it('is no longer active at sunrise', () => {
    expect(deriveStatus(fajr, undefined, day.sunriseMs - 1)).toBe('ACTIVE_UNCONFIRMED');
    expect(deriveStatus(fajr, undefined, day.sunriseMs)).toBe('WINDOW_ENDED_UNCONFIRMED');
  });

  it('sends no reminder at or after sunrise', () => {
    const events = desiredEvents([fajr], {}, () => s, fajr.startMs - MIN, 500);
    expect(events.length).toBeGreaterThan(1);
    expect(events.every((e) => e.atMs < day.sunriseMs)).toBe(true);
  });

  it('ends any restriction at sunrise', () => {
    const [w] = buildBlockWindows([fajr], {}, () => s, true, fajr.startMs);
    expect(w.endMs).toBe(day.sunriseMs);
  });

  it('Not Yet just before sunrise promises no reminder after it', () => {
    expect(nextReminderAt(fajr, s, true, day.sunriseMs - MIN)).toBeNull();
  });
});

describe('Demo Mode Not Yet', () => {
  it('stays active with reminders and restriction intact', () => {
    const started = startPrayer(createDemo(at(14)));
    const deferred = deferDemo(started);
    expect(demoStatus(deferred)).toBe('ACTIVE_UNCONFIRMED');
    expect(demoPending(deferred)).toEqual(demoPending(started));
    expect(demoBlock(deferred)).toEqual(demoBlock(started));
    expect(deferred.deferred).toBe(true);
  });
});
