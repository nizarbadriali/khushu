import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { GeometricPattern, LogoMark } from '@/components/art';
import { LocationPicker } from '@/components/location-picker';
import { fonts, useTheme } from '@/components/theme';
import { Screen, T } from '@/components/ui';
import { requestNotificationPermission } from '@/services/notifications';
import { useApp } from '@/store/app';

export default function Welcome() {
  const t = useTheme();
  const update = useApp((s) => s.updateSettings);

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: t.forest }]}>
        <GeometricPattern color={t.gold} opacity={0.18} />
        <LogoMark size={52} color={t.gold} accent={t.forest} />
        <T style={styles.title}>Kushu</T>
        <T style={styles.tagline}>A reminder that doesn&apos;t stop at reminding.</T>
      </View>
      <T color={t.muted}>
        Choose your location to calculate prayer times. They are calculated on your device and work
        offline.
      </T>
      <LocationPicker
        onPick={async (location) => {
          await update({ location });
          await requestNotificationPermission();
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 24, gap: 6, overflow: 'hidden' },
  title: { color: '#FAF8F3', fontFamily: fonts.display, fontSize: 38, lineHeight: 46, marginTop: 10 },
  tagline: { color: '#FAF8F3', opacity: 0.8, fontFamily: fonts.regular, fontSize: 15 },
});
