import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Polygon, Rect } from 'react-native-svg';

const STAR = '24,2 30.4,8.6 39.6,8.4 39.4,17.6 46,24 39.4,30.4 39.6,39.6 30.4,39.4 24,46 17.6,39.4 8.4,39.6 8.6,30.4 2,24 8.6,17.6 8.4,8.4 17.6,8.6';

/** Eight-point star lattice, drawn as a quiet texture behind hero surfaces. */
export function GeometricPattern({ color, opacity = 0.1 }: { color: string; opacity?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="girih" patternUnits="userSpaceOnUse" width={48} height={48}>
            <Polygon points={STAR} fill="none" stroke={color} strokeWidth={1} />
            <Polygon points="24,14.1 33.9,24 24,33.9 14.1,24" fill="none" stroke={color} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#girih)" opacity={opacity} />
      </Svg>
    </View>
  );
}

export function LogoMark({ size = 36, color, accent }: { size?: number; color: string; accent: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Polygon points={STAR} fill={color} />
      <Path d="M16.5 24.5l5.2 5.2L32 19" fill="none" stroke={accent} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8',
  history: 'M4 12a8 8 0 1 0 2.6-5.9M4 4.5V8h3.5M12 8v4.5l3 1.8',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  check: 'M5 12.5l4.6 4.6L19 7.5',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  lock: 'M6.5 11h11v9h-11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  unlock: 'M6.5 11h11v9h-11zM8.5 11V8a3.5 3.5 0 0 1 6.6-1.6',
  bell: 'M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 21h4',
  play: 'M8 5.5v13l10.5-6.5z',
  stop: 'M7 7h10v10H7z',
  x: 'M6 6l12 12M18 6L6 18',
  spark: 'M12 3v5M12 16v5M3 12h5M16 12h5',
  forward: 'M5 6l7 6-7 6zM13 6l7 6-7 6z',
  alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.2',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color, width = 1.9 }: { name: IconName; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
        <Path d={ICONS[name]} />
      </G>
    </Svg>
  );
}

export function Dot({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
    </Svg>
  );
}
