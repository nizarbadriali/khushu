import { activeBlock, BlockWindow, buildBlockWindows } from './blockPlan';
import { buildReminderEvents, ReminderEvent } from './reminderPlan';
import { confirmPrayer, deriveStatus } from './stateMachine';
import {
  DEFAULT_SETTINGS,
  PrayerInstance,
  PrayerRecords,
  PrayerSettings,
  PrayerStatus,
} from './types';

const MINUTE = 60_000;

/**
 * Demo Mode drives the production state machine, reminder planner and block
 * planner with a simulated clock. Its records live here, never in the real store.
 */
export interface DemoState {
  simNowMs: number;
  instance: PrayerInstance;
  settings: PrayerSettings;
  records: PrayerRecords;
  fired: ReminderEvent[];
  /** The prompt was dismissed with Not Yet. Reminders and restrictions are unaffected. */
  deferred: boolean;
}

export function createDemo(realNowMs: number): DemoState {
  const startMs = realNowMs + 5 * MINUTE;
  return {
    simNowMs: realNowMs,
    instance: {
      id: 'demo_asr',
      prayer: 'asr',
      date: 'demo',
      startMs,
      cutoffMs: startMs + 150 * MINUTE,
    },
    settings: { ...DEFAULT_SETTINGS.prayers.asr, intervalMin: 30, lockEnabled: true },
    records: {},
    fired: [],
    deferred: false,
  };
}

export const demoStatus = (s: DemoState): PrayerStatus =>
  deriveStatus(s.instance, s.records[s.instance.id], s.simNowMs);

export const demoPending = (s: DemoState): ReminderEvent[] =>
  demoStatus(s) === 'CONFIRMED'
    ? []
    : buildReminderEvents(s.instance, s.settings).filter((e) => e.atMs > s.simNowMs);

export const demoBlock = (s: DemoState): BlockWindow | null =>
  activeBlock(
    buildBlockWindows([s.instance], s.records, () => s.settings, true, s.simNowMs),
    s.simNowMs,
  );

function advanceTo(s: DemoState, atMs: number): DemoState {
  const due = demoPending(s).filter((e) => e.atMs <= atMs);
  // A delivered reminder asks the question again.
  const deferred = s.deferred && due.length === 0;
  return { ...s, simNowMs: atMs, fired: [...s.fired, ...due], deferred };
}

export const startPrayer = (s: DemoState) => advanceTo(s, s.instance.startMs);

export function setDemoInterval(s: DemoState, intervalMin: number): DemoState {
  return { ...s, settings: { ...s.settings, intervalMin } };
}

/** Jumps the simulated clock to the next pending event. */
export function fastForward(s: DemoState): DemoState {
  const next = demoPending(s)[0];
  return next ? advanceTo(s, next.atMs) : s;
}

export const deferDemo = (s: DemoState): DemoState => ({ ...s, deferred: true });

export function confirmDemo(s: DemoState): DemoState {
  return { ...s, records: confirmPrayer(s.records, s.instance, s.simNowMs) };
}
