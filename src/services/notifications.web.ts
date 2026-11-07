import type * as Native from './notifications';

/**
 * Browsers have no scheduled local notifications, categories or channels, and
 * expo-notifications throws on most of them. Every call here is a deliberate no-op so
 * the web preview renders, and NOTIFICATIONS_AVAILABLE lets screens say so honestly
 * rather than implying that a reminder was delivered.
 */
export const NOTIFICATIONS_AVAILABLE: typeof Native.NOTIFICATIONS_AVAILABLE = false;

export const ACTION_PRAYED: typeof Native.ACTION_PRAYED = 'PRAYED';
export const ACTION_LATER: typeof Native.ACTION_LATER = 'LATER';

export const setupNotifications: typeof Native.setupNotifications = async () => {};

export const notificationPermission: typeof Native.notificationPermission = async () => ({
  granted: false,
  canAskAgain: false,
});

export const requestNotificationPermission: typeof Native.requestNotificationPermission =
  async () => false;

export const syncNotifications: typeof Native.syncNotifications = async () => {};

export const dismissPresented: typeof Native.dismissPresented = async () => {};

export const instanceFromResponse: typeof Native.instanceFromResponse = () => null;

export const listenForResponses: typeof Native.listenForResponses = () => () => {};

export const presentDemo: typeof Native.presentDemo = async () => {};

export const dismissAllDemo: typeof Native.dismissAllDemo = async () => {};
