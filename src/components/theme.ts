import { useColorScheme } from 'react-native';

import { useApp } from '@/store/app';

const light = {
  dark: false,
  bg: '#FAF8F3',
  card: '#FFFFFF',
  text: '#16241F',
  muted: '#66736D',
  border: '#ECE7DB',
  emerald: '#075E4A',
  forest: '#064635',
  gold: '#C9A55C',
  goldText: '#8C6D2C',
  ivory: '#FAF8F3',
  green: '#12925A',
  greenSoft: '#E4F3EB',
  warnSoft: '#FBF1DC',
  warn: '#8A6414',
  dangerSoft: '#F8E7E3',
  danger: '#A63A2A',
};

export type Theme = typeof light;

const dark: Theme = {
  dark: true,
  bg: '#0B1613',
  card: '#13231E',
  text: '#F3F0E8',
  muted: '#9AA8A2',
  border: '#22352E',
  emerald: '#0A7259',
  forest: '#064635',
  gold: '#D6B66F',
  goldText: '#D6B66F',
  ivory: '#FAF8F3',
  green: '#1FAE6E',
  greenSoft: '#143328',
  warnSoft: '#33290F',
  warn: '#E5C678',
  dangerSoft: '#3A1E19',
  danger: '#EE9C8C',
};

export const fonts = {
  display: 'Fraunces_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

export function useTheme(): Theme {
  const system = useColorScheme();
  const appearance = useApp((s) => s.settings.appearance);
  const mode = appearance === 'system' ? system : appearance;
  return mode === 'dark' ? dark : light;
}
