import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/art';
import { fonts } from '@/components/theme';
import { formatCountdown, formatDuration } from '@/core/format';
import { buildActivityProps, WidgetPrayerRow, WidgetSnapshot } from '@/core/widgetData';

/*
 * React Native approximations of the native widgets, driven by the same snapshot.
 * The real ones are SwiftUI in src/widgets, and these never run on the Home Screen.
 * Sizes are the WidgetKit sizes for a 393 point wide iPhone.
 */

const INK = '#FAF8F3';
const SOFT = '#BFD2C9';
const GOLD = '#D6B66F';
const GREEN = '#4FD08F';
const FOREST = '#064635';

function Label({ children, color = GOLD, size = 11 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <Text numberOfLines={1} style={{ color, fontFamily: fonts.semibold, fontSize: size, letterSpacing: 0.6 }}>
      {children}
    </Text>
  );
}

function Tile({
  children,
  style,
  onPress,
  label,
}: {
  children: ReactNode;
  style: object;
  onPress?: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.tile, style]}>
      {children}
    </Pressable>
  );
}

const nextTime = (s: WidgetSnapshot) =>
  s.next ? (s.next.tomorrow ? `Tomorrow ${s.next.timeLabel}` : s.next.timeLabel) : '';

export function SmallWidget({ s, now, onPress }: { s: WidgetSnapshot; now: number; onPress?: () => void }) {
  return (
    <Tile style={styles.small} onPress={onPress} label="Next Prayer widget">
      <Label>KUSHU</Label>
      <View style={{ flex: 1 }} />
      {s.next ? (
        <>
          <Label color={SOFT} size={10}>
            NEXT PRAYER
          </Label>
          <Text numberOfLines={1} style={styles.smallName}>
            {s.next.label}
          </Text>
          <Text numberOfLines={1} style={styles.smallTime}>
            {nextTime(s)}
          </Text>
          {s.countdown ? (
            <Text numberOfLines={1} style={styles.smallCount}>
              Begins in {formatDuration(s.next.startMs - now)}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.refresh}>Open Kushu to update prayer times</Text>
      )}
    </Tile>
  );
}

function PrayerRows({ rows, size }: { rows: WidgetPrayerRow[]; size: number }) {
  return rows.map((r) => (
    <View key={r.prayer} style={styles.row}>
      <Text
        style={{
          flex: 1,
          color: r.isNext ? GOLD : INK,
          fontFamily: r.isNext ? fonts.semibold : fonts.regular,
          fontSize: size,
        }}>
        {r.label}
      </Text>
      <Text
        style={{
          color: r.isNext ? GOLD : SOFT,
          fontFamily: r.isNext ? fonts.semibold : fonts.regular,
          fontSize: size,
        }}>
        {r.timeLabel}
      </Text>
      <View
        accessibilityLabel={r.done ? 'Confirmed' : 'Not confirmed'}
        style={[
          styles.dot,
          { width: size + 1, height: size + 1, borderRadius: size },
          r.done ? { backgroundColor: GREEN, borderColor: GREEN } : { borderColor: SOFT },
        ]}>
        {r.done ? <Icon name="check" size={size - 4} color={FOREST} width={3.5} /> : null}
      </View>
    </View>
  ));
}

export function MediumWidget({ s, onPress }: { s: WidgetSnapshot; onPress?: () => void }) {
  return (
    <Tile style={styles.medium} onPress={onPress} label="Today's Prayers widget">
      <Label>KUSHU — TODAY&apos;S PRAYERS</Label>
      <View style={{ gap: 3, marginTop: 6 }}>
        <PrayerRows rows={s.rows} size={13} />
      </View>
    </Tile>
  );
}

export function LargeWidget({ s, now, onPress }: { s: WidgetSnapshot; now: number; onPress?: () => void }) {
  return (
    <Tile style={styles.large} onPress={onPress} label="Prayer Dashboard widget">
      <View style={styles.spread}>
        <Label size={12}>KUSHU</Label>
        <Text numberOfLines={1} style={styles.date}>
          {s.dateLabel}
        </Text>
      </View>
      {s.next ? (
        <View style={[styles.spread, { alignItems: 'flex-end', marginTop: 8 }]}>
          <View>
            <Label color={SOFT} size={10}>
              NEXT PRAYER
            </Label>
            <Text style={styles.largeName}>{s.next.label}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.date}>{nextTime(s)}</Text>
            {s.countdown ? (
              <Text style={styles.timer}>{formatCountdown(s.next.startMs, now)}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={styles.refresh}>Open Kushu to update prayer times</Text>
      )}
      {s.windowNote ? <Text style={styles.note}>{s.windowNote}</Text> : null}
      <View style={{ gap: 6, marginTop: 10 }}>
        <PrayerRows rows={s.rows} size={15} />
      </View>
      <View style={{ flex: 1 }} />
      <Text style={styles.date}>
        {s.completed} of {s.total} confirmed today
      </Text>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${s.total ? (s.completed / s.total) * 100 : 0}%` }]}
        />
      </View>
    </Tile>
  );
}

export function LockActivity({ s, now, onPress }: { s: WidgetSnapshot; now: number; onPress?: () => void }) {
  const p = buildActivityProps(s);
  if (!p) return null;
  return (
    <Tile style={styles.lock} onPress={onPress} label="Next prayer Live Activity">
      <View style={styles.spread}>
        <View style={{ flex: 1, gap: 3 }}>
          <Label>KUSHU</Label>
          <Text numberOfLines={1} style={styles.lockTitle}>
            NEXT PRAYER: {p.label.toUpperCase()}
            {p.tomorrow ? ', TOMORROW' : ''}
          </Text>
          <Text numberOfLines={1} style={styles.date}>
            {p.timeLabel} · {p.progress}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.timer}>{formatCountdown(p.startMs, now)}</Text>
          <Text style={styles.remaining}>remaining</Text>
        </View>
      </View>
    </Tile>
  );
}

export type IslandMode = 'compact' | 'expanded' | 'minimal';

export function DynamicIsland({
  s,
  now,
  mode,
  onPress,
}: {
  s: WidgetSnapshot;
  now: number;
  mode: IslandMode;
  onPress?: () => void;
}) {
  const p = buildActivityProps(s);
  if (!p) return null;

  if (mode === 'minimal') {
    return (
      <View style={styles.islandRow} pointerEvents="box-none">
        <View style={styles.islandPill} />
        <Pressable accessibilityRole="button" accessibilityLabel="Minimal presentation" onPress={onPress} style={styles.islandMinimal}>
          <Icon name="spark" size={14} color={GOLD} />
        </Pressable>
      </View>
    );
  }

  if (mode === 'compact') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compact presentation"
        onPress={onPress}
        style={styles.islandCompact}>
        <View style={styles.islandSide}>
          <Icon name="spark" size={13} color={GOLD} />
          <Text style={styles.islandName}>{p.shortLabel}</Text>
        </View>
        <Text style={styles.islandTimer}>{formatCountdown(p.startMs, now)}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Expanded presentation"
      onPress={onPress}
      style={styles.islandExpanded}>
      <View style={styles.spread}>
        <View>
          <Label color={SOFT} size={10}>
            NEXT PRAYER
          </Label>
          <Text style={styles.islandBigName}>{p.label}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Label color={SOFT} size={10}>
            {p.tomorrow ? 'TOMORROW' : 'STARTS'}
          </Label>
          <Text style={styles.islandBigTime}>{p.timeLabel}</Text>
        </View>
      </View>
      <View style={[styles.spread, { alignItems: 'center', marginTop: 8 }]}>
        <Text style={styles.timer}>{formatCountdown(p.startMs, now)}</Text>
        <Text style={styles.date}>Open Kushu</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: FOREST, borderRadius: 22, padding: 14 },
  small: { width: 158, height: 158 },
  medium: { width: 338, height: 158 },
  large: { width: 338, height: 354, padding: 16 },
  lock: { alignSelf: 'stretch', padding: 16 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { borderWidth: 1.25, alignItems: 'center', justifyContent: 'center' },
  smallName: { color: INK, fontFamily: fonts.display, fontSize: 28, lineHeight: 33 },
  smallTime: { color: INK, fontFamily: fonts.medium, fontSize: 14 },
  smallCount: { color: SOFT, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
  refresh: { color: INK, fontFamily: fonts.regular, fontSize: 13 },
  date: { color: SOFT, fontFamily: fonts.regular, fontSize: 12, flexShrink: 1 },
  largeName: { color: INK, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  timer: { color: GOLD, fontFamily: fonts.semibold, fontSize: 22, fontVariant: ['tabular-nums'] },
  note: { color: GOLD, fontFamily: fonts.regular, fontSize: 12, marginTop: 6 },
  track: { height: 5, borderRadius: 3, marginTop: 5, backgroundColor: 'rgba(255,255,255,0.18)' },
  fill: { height: 5, borderRadius: 3, backgroundColor: GREEN },
  lockTitle: { color: INK, fontFamily: fonts.semibold, fontSize: 13 },
  remaining: { color: SOFT, fontFamily: fonts.regular, fontSize: 11 },
  islandRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  islandPill: { width: 126, height: 37, borderRadius: 19, backgroundColor: '#000' },
  islandMinimal: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandCompact: {
    alignSelf: 'center',
    width: 262,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  islandSide: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  islandName: { color: INK, fontFamily: fonts.semibold, fontSize: 12 },
  islandTimer: { color: GOLD, fontFamily: fonts.semibold, fontSize: 12, fontVariant: ['tabular-nums'] },
  islandExpanded: {
    alignSelf: 'stretch',
    marginHorizontal: 10,
    borderRadius: 38,
    backgroundColor: '#000',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 16,
  },
  islandBigName: { color: INK, fontFamily: fonts.semibold, fontSize: 22 },
  islandBigTime: { color: INK, fontFamily: fonts.medium, fontSize: 18 },
});
