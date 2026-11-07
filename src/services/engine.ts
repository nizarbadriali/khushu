import { Blocker } from '../../modules/salahlock-blocker';

import { buildBlockWindows } from '@/core/blockPlan';
import { CalcOptions, instancesAround } from '@/core/prayerTimes';
import { AppSettings, PRAYER_LABEL, PrayerInstance, PrayerRecords } from '@/core/types';
import { dismissPresented, syncNotifications } from '@/services/notifications';
import { syncSurfaces } from '@/services/surfaces';
import { useApp } from '@/store/app';

/** Schedule three days out, so reminders survive a few days without opening the app. */
const HORIZON_DAYS = 3;

export function calcOptions(s: AppSettings): CalcOptions | null {
  return s.location
    ? { location: s.location, method: s.method, asr: s.asr, ishaCutoff: s.ishaCutoff }
    : null;
}

async function syncBlocker(
  instances: PrayerInstance[],
  records: PrayerRecords,
  settings: AppSettings,
  nowMs: number,
) {
  if (!Blocker) return;
  const windows = buildBlockWindows(
    instances,
    records,
    (p) => settings.prayers[p],
    settings.lockEnabled,
    nowMs,
  ).map((w) => ({ ...w, label: PRAYER_LABEL[w.prayer] }));
  await Blocker.setPlan(
    windows,
    settings.lockedApps.map((a) => a.packageName),
  );
}

async function run() {
  const { settings, sync } = useApp.getState();
  const opts = calcOptions(settings);
  if (!opts) return;
  const nowMs = Date.now();
  const instances = instancesAround(nowMs, opts, HORIZON_DAYS);
  await sync(instances, nowMs);
  const { records } = useApp.getState();

  // Independent steps: a notification failure must never keep apps blocked.
  const results = await Promise.allSettled([
    syncBlocker(instances, records, settings, nowMs),
    syncNotifications(instances, records, settings, nowMs),
    syncSurfaces(instances, records, settings, nowMs),
  ]);
  results.forEach((r) => {
    if (r.status === 'rejected') console.warn('Reconcile step failed; will retry', r.reason);
  });
}

let queue: Promise<void> = Promise.resolve();

/**
 * Makes the OS match the stored state. Runs are serialized so overlapping
 * triggers cannot double-schedule, and each is safe to repeat.
 */
export function reconcile(): Promise<void> {
  queue = queue.then(run, run);
  return queue;
}

/** Persist first, then cancel and unlock. A failed cleanup retries on next foreground. */
export async function confirmAndRelease(instance: PrayerInstance): Promise<boolean> {
  const changed = await useApp.getState().confirm(instance, Date.now());
  await reconcile();
  dismissPresented(instance.id).catch((e) => console.warn('Could not clear notifications', e));
  return changed;
}

export async function correctAndReconcile(instance: PrayerInstance, prayed: boolean) {
  await useApp.getState().correct(instance, prayed, Date.now());
  await reconcile();
}
