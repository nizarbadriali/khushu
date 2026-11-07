import { formatCountdown } from '../format';
import { addDays, instancesAround, localDateKey, nextInstance } from '../prayerTimes';
import { confirmPrayer } from '../stateMachine';
import { PrayerInstance } from '../types';
import {
  activityKey,
  buildActivityProps,
  buildCountdownPlan,
  buildWidgetSnapshot,
  buildWidgetTimeline,
  DASHBOARD_URL,
  LiveActivityProps,
  planLiveActivity,
} from '../widgetData';

const opts = {
  location: { latitude: 34.05, longitude: -118.24 },
  method: 'NorthAmerica',
  asr: 'standard' as const,
  ishaCutoff: 'midnight' as const,
};
const display = { timeFormat: '12h' as const, countdown: true };
const noon = new Date(2026, 10, 6, 12, 30).getTime();
const instances = instancesAround(noon, opts, 3);
const find = (id: string) => instances.find((i) => i.id === id) as PrayerInstance;
const asr = find('2026-11-06_asr');
const isha = find('2026-11-06_isha');
const fajr = find('2026-11-06_fajr');
const tomorrowFajr = find('2026-11-07_fajr');

describe('E: widget data shows the correct next prayer', () => {
  const s = buildWidgetSnapshot(instances, {}, display, noon);

  it('picks the next prayer from the engine', () => {
    expect(s.next?.id).toBe(nextInstance(instances, noon)?.id);
    expect(s.next?.label).toBe('Asr');
    expect(s.next?.startMs).toBe(asr.startMs);
    expect(s.next?.tomorrow).toBe(false);
  });

  it('lists the five prayers of today, marking only the next one', () => {
    expect(s.rows.map((r) => r.label)).toEqual(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
    expect(s.rows.filter((r) => r.isNext).map((r) => r.label)).toEqual(['Asr']);
  });

  it('is plain data that survives serialization unchanged', () => {
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('honors the global time format', () => {
    const h24 = buildWidgetSnapshot(instances, {}, { ...display, timeFormat: '24h' }, noon);
    expect(h24.next?.timeLabel).not.toMatch(/AM|PM/);
    expect(s.next?.timeLabel).toMatch(/AM|PM/);
  });

  it('links to the dashboard', () => {
    expect(s.url).toBe(DASHBOARD_URL);
  });
});

describe('F: widget data updates after confirmation', () => {
  const now = asr.startMs + 60_000;
  const before = buildWidgetSnapshot(instances, {}, display, now);
  const records = confirmPrayer({}, asr, now);
  const after = buildWidgetSnapshot(instances, records, display, now);

  it('marks the prayer done and advances progress', () => {
    expect(before.rows[2].done).toBe(false);
    expect(after.rows[2].done).toBe(true);
    expect(before.completed).toBe(0);
    expect(after.completed).toBe(1);
  });

  it('drops the open-window note', () => {
    expect(before.windowNote).toContain('Asr ends at');
    expect(after.windowNote).toBeNull();
  });

  it('carries through the whole timeline', () => {
    const later = buildWidgetTimeline(instances, records, display, now).filter(
      (e) => localDateKey(new Date(e.atMs)) === '2026-11-06',
    );
    expect(later.length).toBeGreaterThan(1);
    expect(later.every((e) => e.props.rows[2].done)).toBe(true);
  });
});

describe('G: the countdown reaches zero at the prayer time', () => {
  it('counts down and stops at zero exactly at the start', () => {
    expect(formatCountdown(asr.startMs, asr.startMs - 42 * 60_000 - 18_000)).toBe('00:42:18');
    expect(formatCountdown(asr.startMs, asr.startMs - 1000)).toBe('00:00:01');
    expect(formatCountdown(asr.startMs, asr.startMs)).toBe('00:00:00');
    expect(formatCountdown(asr.startMs, asr.startMs + 5000)).toBe('00:00:00');
  });

  it('rounds up, so a partial second never shows zero early', () => {
    expect(formatCountdown(asr.startMs, asr.startMs - 1)).toBe('00:00:01');
  });

  it('has a widget entry at the exact start, which moves on to the following prayer', () => {
    const t = buildWidgetTimeline(instances, {}, display, noon);
    const entry = t.find((e) => e.atMs === asr.startMs);
    expect(entry?.props.next?.label).toBe('Maghrib');
    const before = [...t].reverse().find((e) => e.atMs < asr.startMs);
    expect(before?.props.next?.label).toBe('Asr');
  });
});

describe('H: transitions, including midnight', () => {
  const t = buildWidgetTimeline(instances, {}, display, noon);

  it('goes from Isha to the next Fajr, flagged as tomorrow', () => {
    const s = buildWidgetSnapshot(instances, {}, display, isha.startMs);
    expect(s.next?.id).toBe(tomorrowFajr.id);
    expect(s.next?.tomorrow).toBe(true);
    expect(s.rows.some((r) => r.isNext)).toBe(false);
  });

  it('rolls the date and rows at local midnight, with Fajr now today', () => {
    const midnight = addDays(new Date(noon), 1).getTime();
    const entry = t.find((e) => e.atMs === midnight);
    expect(entry).toBeDefined();
    expect(entry?.props.dateLabel).toContain('November 7');
    expect(entry?.props.completed).toBe(0);
    expect(entry?.props.next?.id).toBe(tomorrowFajr.id);
    expect(entry?.props.next?.tomorrow).toBe(false);
    expect(entry?.props.rows.find((r) => r.isNext)?.label).toBe('Fajr');
  });

  it('handles an Isha window that crosses midnight', () => {
    const late = instancesAround(noon, { ...opts, ishaCutoff: 'fajr' }, 3);
    const justAfter = addDays(new Date(noon), 1).getTime() + 60_000;
    const s = buildWidgetSnapshot(late, {}, display, justAfter);
    expect(s.windowNote).toContain('Isha ends at');
    expect(s.next?.label).toBe('Fajr');
  });

  it('survives a DST day: a timeline across the November change hits each midnight', () => {
    const before = new Date(2026, 9, 31, 12).getTime();
    const dst = buildWidgetTimeline(instancesAround(before, opts, 3), {}, display, before);
    const hours = dst.map((e) => new Date(e.atMs)).filter((d) => d.getHours() === 0 && d.getMinutes() === 0);
    expect(hours.map((d) => d.getDate())).toEqual(expect.arrayContaining([1, 2]));
  });

  it('is strictly ordered with no repeated moments', () => {
    const times = t.map((e) => e.atMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });

  it('ends by asking for the app, never showing an expired prayer as next', () => {
    expect(t[t.length - 1].props.next).toBeNull();
  });

  it('shows Fajr closing at sunrise, then nothing open until Dhuhr', () => {
    const during = buildWidgetSnapshot(instances, {}, display, fajr.startMs + 60_000);
    expect(during.windowNote).toContain('Fajr ends at sunrise');
    const after = buildWidgetSnapshot(instances, {}, display, fajr.cutoffMs);
    expect(after.windowNote).toBeNull();
    expect(after.next?.label).toBe('Dhuhr');
  });

  it('gives the timeline an entry at sunrise so the note clears without the app', () => {
    const early = buildWidgetTimeline(instances, {}, display, fajr.startMs + 60_000);
    expect(early.some((e) => e.atMs === fajr.cutoffMs)).toBe(true);
  });
});

describe('J: Live Activity reconciliation', () => {
  const desired = buildActivityProps(
    buildWidgetSnapshot(instances, {}, display, noon),
  ) as LiveActivityProps;
  const base = {
    enabled: true,
    desired,
    existingIds: [] as string[],
    lastPrayerId: null,
    lastKey: null,
  };

  it('starts one when none exists', () => {
    expect(planLiveActivity(base)).toEqual({ end: [], keep: null, update: false, start: true });
  });

  it('never starts a second one beside an existing activity', () => {
    const p = planLiveActivity({ ...base, existingIds: ['a'], lastKey: activityKey(desired) });
    expect(p).toEqual({ end: [], keep: 'a', update: false, start: false });
  });

  it('ends duplicates, keeping exactly one', () => {
    const p = planLiveActivity({ ...base, existingIds: ['a', 'b', 'c'] });
    expect(p.keep).toBe('a');
    expect(p.end).toEqual(['b', 'c']);
    expect(p.start).toBe(false);
  });

  it('updates in place when the next prayer changes', () => {
    const next = buildActivityProps(
      buildWidgetSnapshot(instances, {}, display, asr.startMs),
    ) as LiveActivityProps;
    const p = planLiveActivity({
      ...base,
      desired: next,
      existingIds: ['a'],
      lastKey: activityKey(desired),
    });
    expect(next.label).toBe('Maghrib');
    expect(p).toEqual({ end: [], keep: 'a', update: true, start: false });
  });

  it('ignores the moving start of the timer when deciding whether anything changed', () => {
    expect(activityKey({ ...desired, fromMs: 1 })).toBe(activityKey({ ...desired, fromMs: 2 }));
  });

  it('updates after a confirmation changes the progress', () => {
    const records = confirmPrayer({}, asr, asr.startMs + 1000);
    const done = buildActivityProps(
      buildWidgetSnapshot(instances, records, display, asr.startMs + 2000),
    ) as LiveActivityProps;
    expect(done.progress).toBe('1 of 5 today');
    const p = planLiveActivity({
      ...base,
      desired: done,
      existingIds: ['a'],
      lastKey: activityKey(desired),
    });
    expect(p.update).toBe(true);
  });

  it('respects a dismissal by not restarting for the same prayer', () => {
    const p = planLiveActivity({ ...base, lastPrayerId: desired.prayerId });
    expect(p.start).toBe(false);
  });

  it('starts again for the following prayer after a dismissal', () => {
    expect(planLiveActivity({ ...base, lastPrayerId: 'older' }).start).toBe(true);
  });

  it('ends everything when turned off or when no prayer is known', () => {
    expect(planLiveActivity({ ...base, enabled: false, existingIds: ['a', 'b'] })).toEqual({
      end: ['a', 'b'],
      keep: null,
      update: false,
      start: false,
    });
    expect(planLiveActivity({ ...base, desired: null, existingIds: ['a'] }).end).toEqual(['a']);
  });

  it('abbreviates the name for the compact Dynamic Island', () => {
    const maghrib = buildActivityProps(
      buildWidgetSnapshot(instances, {}, display, asr.startMs),
    ) as LiveActivityProps;
    expect(maghrib.shortLabel).toBe('Mgrb');
  });
});

describe('Android countdown plan', () => {
  it('lists only future prayers in order, crossing midnight', () => {
    const plan = buildCountdownPlan(instances, '12h', isha.startMs - 1000);
    expect(plan[0].label).toBe('Isha');
    expect(plan[1].label).toBe('Fajr');
    expect(plan[1].startMs).toBe(tomorrowFajr.startMs);
    expect(plan.every((e, i) => i === 0 || e.startMs > plan[i - 1].startMs)).toBe(true);
  });
});
