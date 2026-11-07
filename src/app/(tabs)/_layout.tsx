import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/art';
import { fonts, useTheme } from '@/components/theme';
import { useApp } from '@/store/app';

const tabIcon = (name: IconName) =>
  function TabIcon({ color }: { color?: unknown }) {
    return <Icon name={name} color={String(color)} size={23} />;
  };

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hasLocation = useApp((s) => s.settings.location !== null);
  if (!hasLocation) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.emerald,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          height: 58 + insets.bottom,
        },
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tabIcon('history') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon('sliders') }} />
    </Tabs>
  );
}
