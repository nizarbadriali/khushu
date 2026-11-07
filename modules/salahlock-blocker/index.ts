import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export interface BlockerStatus {
  usageAccess: boolean;
  overlay: boolean;
  exactAlarm: boolean;
  activeWindowId: string | null;
  activeLabel: string | null;
  released: string[];
}

export interface InstalledApp {
  packageName: string;
  label: string;
  icon: string;
}

export interface NativeBlockWindow {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
}

interface NativeBlocker {
  getStatus(): BlockerStatus;
  getInstalledApps(): Promise<InstalledApp[]>;
  openUsageAccessSettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  setPlan(windows: NativeBlockWindow[], packages: string[]): Promise<void>;
  release(id: string): Promise<void>;
  startDemoBlock(label: string, durationMs: number): Promise<void>;
  stopDemoBlock(): Promise<void>;
}

/** Null anywhere the native module is absent, such as iOS or the web. */
export const Blocker: NativeBlocker | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<NativeBlocker>('SalahlockBlocker') : null;
