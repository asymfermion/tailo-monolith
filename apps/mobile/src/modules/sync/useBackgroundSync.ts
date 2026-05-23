import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDatabase } from '@/db';

import { runCloudSyncPass } from './runCloudSyncPass';

export function useBackgroundSync(requiresLogin = false): void {
  useEffect(() => {
    if (requiresLogin) {
      return;
    }

    let appState: AppStateStatus = AppState.currentState;

    const runSyncPass = () => {
      void getDatabase().then((database) => runCloudSyncPass(database));
    };

    runSyncPass();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.match(/inactive|background/) && nextState === 'active') {
        runSyncPass();
      }

      appState = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [requiresLogin]);
}
