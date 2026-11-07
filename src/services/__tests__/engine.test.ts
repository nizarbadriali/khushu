import { Blocker } from '../../../modules/salahlock-blocker';

import { computeDay } from '@/core/prayerTimes';
import { DEFAULT_SETTINGS } from '@/core/types';
import { confirmAndRelease } from '@/services/engine';
import { dismissPresented, syncNotifications } from '@/services/notifications';
import { syncSurfaces } from '@/services/surfaces';
import { useApp } from '@/store/app';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../modules/salahlock-blocker', () => ({
  Blocker: { setPlan: jest.fn(async () => {}) },
}));
jest.mock('@/services/notifications', () => ({
  syncNotifications: jest.fn(async () => {}),
  dismissPresented: jest.fn(async () => {}),
}));
jest.mock('@/services/surfaces', () => ({ syncSurfaces: jest.fn(async () => {}) }));

const location = { latitude: 34.05, longitude: -118.24, label: 'Los Angeles', source: 'manual' as const };
const today = new Date();
const opts = { location, method: 'NorthAmerica', asr: 'standard' as const, ishaCutoff: 'midnight' as const };

/** Today's Asr, with the clock held inside its window. */
const asr = computeDay(today, opts).instances[2];
const during = asr.startMs + 60_000;

const setPlan = Blocker?.setPlan as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers({ now: during, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.clearAllMocks();
  useApp.setState({
    hydrated: true,
    records: {},
    deferrals: {},
    settings: {
      ...DEFAULT_SETTINGS,
      location,
      lockEnabled: true,
      lockedApps: [{ packageName: 'com.example', label: 'Example' }],
      prayers: {
        ...DEFAULT_SETTINGS.prayers,
        asr: { ...DEFAULT_SETTINGS.prayers.asr, lockEnabled: true },
      },
    },
  });
});

afterEach(() => jest.useRealTimers());

describe('what each button actually does to the device', () => {
  it('Not Yet calls nothing that schedules, cancels or unlocks', async () => {
    const before = useApp.getState();
    await useApp.getState().defer(asr, asr.startMs + 30 * 60_000, during);

    const after = useApp.getState();
    expect(after.records).toBe(before.records);
    expect(after.settings).toBe(before.settings);
    expect(after.deferrals[asr.id]).toBe(asr.startMs + 30 * 60_000);
    expect(syncNotifications).not.toHaveBeenCalled();
    expect(dismissPresented).not.toHaveBeenCalled();
    expect(setPlan).not.toHaveBeenCalled();
    expect(syncSurfaces).not.toHaveBeenCalled();
  });

  it('Yes confirms, drops this window, clears its alerts and refreshes the surfaces', async () => {
    await useApp.getState().defer(asr, asr.startMs + 30 * 60_000, during);
    await confirmAndRelease(asr);

    const { records, deferrals } = useApp.getState();
    expect(records[asr.id].confirmedAtMs).toBe(during);
    expect(deferrals).toEqual({});

    const [windows] = setPlan.mock.calls[0];
    expect(windows.map((w: { id: string }) => w.id)).not.toContain(asr.id);

    const [, recordsSent] = (syncNotifications as jest.Mock).mock.calls[0];
    expect(recordsSent[asr.id].confirmedAtMs).toBe(during);
    expect(dismissPresented).toHaveBeenCalledWith(asr.id);

    const [, surfaceRecords] = (syncSurfaces as jest.Mock).mock.calls[0];
    expect(surfaceRecords[asr.id].confirmedAtMs).toBe(during);
  });

  it('an unconfirmed active prayer keeps its restriction window', async () => {
    const { reconcile } = jest.requireActual('@/services/engine');
    await reconcile();
    const [windows] = setPlan.mock.calls[0];
    expect(windows.map((w: { id: string }) => w.id)).toContain(asr.id);
  });

  it('a failing surface cannot stop reminders or unlocking', async () => {
    (syncSurfaces as jest.Mock).mockRejectedValueOnce(new Error('ActivityKit refused'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await confirmAndRelease(asr);
    expect(setPlan).toHaveBeenCalled();
    expect(syncNotifications).toHaveBeenCalled();
    warn.mockRestore();
  });
});
