import { Platform } from 'react-native';

import { Countdown } from '../../modules/kushu-countdown';

import { AppSettings, PrayerInstance, PrayerRecords } from '@/core/types';
import { buildCountdownPlan } from '@/core/widgetData';

export interface SurfaceStatus {
  /** True where these features can only be shown as a browser simulation. */
  simulated: boolean;
  rows: { title: string; value: string; detail?: string }[];
}

/**
 * Android and web. iOS uses surfaces.ios.ts, which is the only code that loads
 * expo-widgets, so this path cannot be affected by the widget runtime.
 */
export async function syncSurfaces(
  instances: PrayerInstance[],
  _records: PrayerRecords,
  settings: AppSettings,
  nowMs: number,
) {
  if (!Countdown) return;
  if (settings.countdownEnabled) {
    Countdown.setPlan(JSON.stringify(buildCountdownPlan(instances, settings.timeFormat, nowMs)));
  } else {
    Countdown.clear();
  }
}

export function surfaceStatus(settings: AppSettings): SurfaceStatus {
  if (Platform.OS === 'web') {
    return {
      simulated: true,
      rows: [
        { title: 'Home Screen widgets', value: 'Simulated', detail: 'Real widgets need an iPhone build.' },
        { title: 'Live Activity', value: 'Simulated', detail: 'Real Live Activities need an iPhone build.' },
        { title: 'Dynamic Island', value: 'Simulated' },
        { title: 'Android countdown', value: 'Not in a browser' },
      ],
    };
  }

  const canPost = Countdown?.canPost() ?? false;
  return {
    simulated: false,
    rows: [
      {
        title: 'Countdown notification',
        value: !settings.countdownEnabled ? 'Off' : canPost ? 'On' : 'Notifications off',
        detail: 'A quiet ongoing notification with a countdown kept by Android.',
      },
      { title: 'Home Screen widgets', value: 'Not available yet' },
      { title: 'Live Activity', value: 'iPhone only' },
    ],
  };
}
