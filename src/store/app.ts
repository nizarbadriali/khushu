import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { clearDeferral, deferPrompt, Deferrals } from '@/core/notYet';
import { confirmPrayer, correctPrayer, syncRecords } from '@/core/stateMachine';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  PRAYERS,
  PrayerInstance,
  PrayerName,
  PrayerRecords,
  PrayerSettings,
} from '@/core/types';

const STORAGE_KEY = 'salahlock.state.v1';

interface AppState {
  hydrated: boolean;
  settings: AppSettings;
  records: PrayerRecords;
  deferrals: Deferrals;
  hydrate(): Promise<void>;
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
  updatePrayer(prayer: PrayerName, patch: Partial<PrayerSettings>): Promise<void>;
  confirm(instance: PrayerInstance, nowMs: number): Promise<boolean>;
  correct(instance: PrayerInstance, prayed: boolean, nowMs: number): Promise<void>;
  sync(instances: PrayerInstance[], nowMs: number): Promise<void>;
  /** Not Yet. Touches neither records nor settings, so it triggers no reconcile. */
  defer(instance: PrayerInstance, nextReminderMs: number | null, nowMs: number): Promise<void>;
}

/** Older saves may lack newer fields, so saved values layer over current defaults. */
function mergeSettings(saved: Partial<AppSettings> | undefined): AppSettings {
  const prayers = { ...DEFAULT_SETTINGS.prayers };
  for (const p of PRAYERS) prayers[p] = { ...prayers[p], ...saved?.prayers?.[p] };
  return { ...DEFAULT_SETTINGS, ...saved, prayers };
}

export const useApp = create<AppState>((set, get) => {
  const save = () => {
    const { settings, records, deferrals } = get();
    return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, records, deferrals }));
  };

  return {
    hydrated: false,
    settings: DEFAULT_SETTINGS,
    records: {},
    deferrals: {},

    async hydrate() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        set({
          settings: mergeSettings(saved.settings),
          records: saved.records ?? {},
          deferrals: saved.deferrals ?? {},
        });
      } catch (e) {
        console.warn('Could not read saved state; using defaults', e);
      }
      set({ hydrated: true });
    },

    async updateSettings(patch) {
      set({ settings: { ...get().settings, ...patch } });
      await save();
    },

    async updatePrayer(prayer, patch) {
      const { settings } = get();
      const prayers = { ...settings.prayers, [prayer]: { ...settings.prayers[prayer], ...patch } };
      set({ settings: { ...settings, prayers } });
      await save();
    },

    /** Resolves true when this call changed state, after the change is on disk. */
    async confirm(instance, nowMs) {
      const records = get().records;
      const next = confirmPrayer(records, instance, nowMs);
      if (next === records) return false;
      set({ records: next, deferrals: clearDeferral(get().deferrals, instance.id) });
      await save();
      return true;
    },

    async correct(instance, prayed, nowMs) {
      set({ records: correctPrayer(get().records, instance, prayed, nowMs) });
      await save();
    },

    async defer(instance, nextReminderMs, nowMs) {
      set({ deferrals: deferPrompt(get().deferrals, instance, nextReminderMs, nowMs) });
      await save();
    },

    async sync(instances, nowMs) {
      const records = get().records;
      const next = syncRecords(records, instances, nowMs);
      if (next === records) return;
      set({ records: next });
      await save();
    },
  };
});
