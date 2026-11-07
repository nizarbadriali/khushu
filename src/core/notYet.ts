import { buildReminderEvents } from './reminderPlan';
import { PrayerInstance, PrayerSettings } from './types';

/**
 * "Not Yet" only hides the prompt. It is kept apart from PrayerRecords on purpose:
 * reminders and restrictions are derived from records, so nothing written here can
 * cancel a reminder, release a restriction or mark a prayer as prayed.
 *
 * Maps an instance id to the moment its prompt may expand again.
 */
export type Deferrals = Record<string, number>;

/** The next reminder on the existing schedule, or null if none remain before the cutoff. */
export function nextReminderAt(
  instance: PrayerInstance,
  settings: PrayerSettings,
  notificationsEnabled: boolean,
  nowMs: number,
): number | null {
  if (!notificationsEnabled || !settings.enabled) return null;
  const next = buildReminderEvents(instance, settings).find((e) => e.atMs > nowMs);
  return next?.atMs ?? null;
}

/** Collapses the prompt until the next reminder, or until the cutoff when none remain. */
export function deferPrompt(
  deferrals: Deferrals,
  instance: PrayerInstance,
  nextReminderMs: number | null,
  nowMs: number,
): Deferrals {
  const kept = Object.fromEntries(Object.entries(deferrals).filter(([, until]) => until > nowMs));
  return { ...kept, [instance.id]: nextReminderMs ?? instance.cutoffMs };
}

export const isPromptCollapsed = (deferrals: Deferrals, instanceId: string, nowMs: number) =>
  (deferrals[instanceId] ?? 0) > nowMs;

export function clearDeferral(deferrals: Deferrals, instanceId: string): Deferrals {
  if (!(instanceId in deferrals)) return deferrals;
  const { [instanceId]: _cleared, ...rest } = deferrals;
  return rest;
}
