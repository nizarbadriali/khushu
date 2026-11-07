import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

interface NativeCountdown {
  /** JSON array of { label, timeLabel, startMs }, earliest first. */
  setPlan(entriesJson: string): void;
  clear(): void;
  canPost(): boolean;
}

/** Null anywhere the native module is absent, such as iOS or the web. */
export const Countdown: NativeCountdown | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<NativeCountdown>('KushuCountdown') : null;
