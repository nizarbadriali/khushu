import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { BlockerStatus, Blocker } from '../../modules/salahlock-blocker';

import { notificationPermission } from '@/services/notifications';

export interface PermissionState {
  notifications: boolean;
  canAskNotifications: boolean;
  blocker: BlockerStatus | null;
}

/** Permissions change in system settings, so re-read whenever the app returns. */
export function usePermissions() {
  const [state, setState] = useState<PermissionState>({
    notifications: true,
    canAskNotifications: true,
    blocker: null,
  });

  const refresh = useCallback(
    () =>
      notificationPermission().then(({ granted, canAskAgain }) =>
        setState({
          notifications: granted,
          canAskNotifications: canAskAgain,
          blocker: Blocker?.getStatus() ?? null,
        }),
      ),
    [],
  );

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { ...state, refresh };
}
