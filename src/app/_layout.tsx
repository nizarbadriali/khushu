import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import type { NotificationResponse } from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { PreviewSafeArea } from '@/components/preview-safe-area';
import { useTheme } from '@/components/theme';
import { confirmAndRelease, reconcile } from '@/services/engine';
import {
  ACTION_PRAYED,
  instanceFromResponse,
  listenForResponses,
  setupNotifications,
} from '@/services/notifications';
import { useApp } from '@/store/app';

SplashScreen.preventAutoHideAsync();

function handleResponse(response: NotificationResponse) {
  if (response.actionIdentifier !== ACTION_PRAYED) return;
  const instance = instanceFromResponse(response);
  if (instance) confirmAndRelease(instance).catch((e) => console.warn('Confirm failed', e));
}

export default function RootLayout() {
  const t = useTheme();
  const hydrated = useApp((s) => s.hydrated);
  const hydrate = useApp((s) => s.hydrate);
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    hydrate();
    setupNotifications().catch((e) => console.warn('Notification setup failed', e));
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    reconcile();

    const stopResponses = listenForResponses(handleResponse);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile();
    });

    // Any setting or record change must reach the OS schedule and the blocker.
    const store = useApp.subscribe((state, previous) => {
      if (state.settings !== previous.settings) reconcile();
    });

    return () => {
      stopResponses();
      appState.remove();
      store();
    };
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && fontsLoaded) SplashScreen.hideAsync();
  }, [hydrated, fontsLoaded]);

  if (!hydrated || !fontsLoaded) return null;

  return (
    <PreviewSafeArea>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      />
    </PreviewSafeArea>
  );
}
