import { useMemo } from 'react';

import { instancesAround, localDateKey } from '@/core/prayerTimes';
import { buildWidgetSnapshot, WidgetSnapshot } from '@/core/widgetData';
import { useNow } from '@/hooks/use-now';
import { calcOptions } from '@/services/engine';
import { useApp } from '@/store/app';

/** The same snapshot real widgets receive, recomputed live for in-app previews. */
export function useWidgetSnapshot(): { snapshot: WidgetSnapshot | null; now: number } {
  const now = useNow();
  const settings = useApp((s) => s.settings);
  const records = useApp((s) => s.records);
  const dayKey = localDateKey(new Date(now));

  const instances = useMemo(() => {
    const opts = calcOptions(settings);
    return opts ? instancesAround(new Date(`${dayKey}T12:00:00`).getTime(), opts, 1) : [];
  }, [settings, dayKey]);

  if (instances.length === 0) return { snapshot: null, now };
  const options = { timeFormat: settings.timeFormat, countdown: settings.countdownEnabled };
  return { snapshot: buildWidgetSnapshot(instances, records, options, now), now };
}
