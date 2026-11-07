import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DynamicIsland,
  IslandMode,
  LockActivity,
  MediumWidget,
  SmallWidget,
} from '@/components/os-surfaces';
import { fonts } from '@/components/theme';
import { useWidgetSnapshot } from '@/hooks/use-widget-snapshot';

export type PreviewMode = 'app' | 'home' | 'lock';

const SPARE_ICONS = Array.from({ length: 8 }, (_, i) => i);
const NEXT_ISLAND: Record<IslandMode, IslandMode> = {
  compact: 'expanded',
  expanded: 'minimal',
  minimal: 'compact',
};

/**
 * A browser picture of the iPhone Home Screen and Lock Screen, for development only.
 * The prayer data is real. The system UI around it is a drawing, and is labeled as one.
 */
export function OsPreview({
  mode,
  onOpenApp,
}: {
  mode: Exclude<PreviewMode, 'app'>;
  onOpenApp: () => void;
}) {
  const { snapshot, now } = useWidgetSnapshot();
  const [island, setIsland] = useState<IslandMode>('compact');

  // Stands in for a kushu:// deep link: the dashboard is where a tap lands.
  const open = () => {
    router.navigate('/');
    onOpenApp();
  };

  const clock = new Date(now);
  const hours = clock.getHours() % 12 || 12;
  const minutes = String(clock.getMinutes()).padStart(2, '0');

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <View style={styles.island}>
        {snapshot ? (
          <DynamicIsland
            s={snapshot}
            now={now}
            mode={island}
            onPress={() => setIsland(NEXT_ISLAND[island])}
          />
        ) : null}
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>SIMULATED IN BROWSER · TAP THE ISLAND TO CYCLE</Text>
      </View>

      {!snapshot ? (
        <Text style={styles.empty}>Choose a location in the app first.</Text>
      ) : mode === 'lock' ? (
        <View style={styles.lock}>
          <Text style={styles.lockDate}>{snapshot.dateLabel}</Text>
          <Text style={styles.lockClock}>
            {hours}:{minutes}
          </Text>
          <View style={styles.lockSpacer} />
          <LockActivity s={snapshot} now={now} onPress={open} />
        </View>
      ) : (
        <View style={styles.home}>
          <View style={styles.homeRow}>
            <SmallWidget s={snapshot} now={now} onPress={open} />
            <View style={styles.icons}>
              {SPARE_ICONS.slice(0, 4).map((i) => (
                <View key={i} style={styles.icon} />
              ))}
            </View>
          </View>
          <MediumWidget s={snapshot} onPress={open} />
          <View style={styles.iconRow}>
            {SPARE_ICONS.slice(4).map((i) => (
              <View key={i} style={styles.icon} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#123A34', zIndex: 10 },
  island: { position: 'absolute', top: 11, left: 0, right: 0, zIndex: 2 },
  badge: { position: 'absolute', top: 164, left: 0, right: 0, alignItems: 'center' },
  badgeText: {
    color: '#D6B66F',
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  empty: { color: '#FAF8F3', fontFamily: fonts.regular, textAlign: 'center', marginTop: 260 },
  lock: { flex: 1, paddingTop: 192, paddingHorizontal: 14, paddingBottom: 44, alignItems: 'center' },
  lockDate: { color: '#FAF8F3', fontFamily: fonts.medium, fontSize: 18 },
  lockClock: { color: '#FAF8F3', fontFamily: fonts.semibold, fontSize: 84, lineHeight: 96 },
  lockSpacer: { flex: 1 },
  home: { flex: 1, paddingTop: 192, paddingHorizontal: 27, gap: 22 },
  homeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  icons: { width: 158, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between' },
  icon: { width: 64, height: 64, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)' },
});
