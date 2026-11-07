import { ReminderEvent } from './reminderPlan';

export const ID_PREFIX = 'sl|';

/** Encodes everything that makes a notification distinct, so identity equals content. */
export function notificationId(e: ReminderEvent, channelId: string): string {
  return `${ID_PREFIX}${e.instanceId}|${e.kind}|${e.atMs}|${channelId}`;
}

export const belongsToInstance = (id: string, instanceId: string) =>
  id.startsWith(`${ID_PREFIX}${instanceId}|`);

export interface ReconcilePlan {
  cancel: string[];
  schedule: { id: string; event: ReminderEvent }[];
}

/** Diffs pending against desired. Unrelated notification ids are never touched. */
export function reconcilePlan(
  pendingIds: string[],
  desired: ReminderEvent[],
  channelFor: (e: ReminderEvent) => string,
): ReconcilePlan {
  const wanted = new Map(desired.map((event) => [notificationId(event, channelFor(event)), event]));
  const pending = new Set(pendingIds);
  return {
    cancel: pendingIds.filter((id) => id.startsWith(ID_PREFIX) && !wanted.has(id)),
    schedule: [...wanted]
      .filter(([id]) => !pending.has(id))
      .map(([id, event]) => ({ id, event })),
  };
}
