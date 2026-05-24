import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDatabase } from '@/db';
import { logTailo } from '@/lib/tailoLogger';

import { runCloudSyncPass } from './runCloudSyncPass';

export async function runBackgroundCloudSyncPass(): Promise<void> {
  try {
    const database = await getDatabase();
    await runCloudSyncPass(database);
  } catch (error) {
    logTailo('Sync', 'Background sync pass failed', {
      message: error instanceof Error ? error.message : 'Unknown error.',
    });
  }
}

export function useBackgroundSync(requiresLogin = false): void {
  useEffect(() => {
    if (requiresLogin) {
      return;
    }

    let appState: AppStateStatus = AppState.currentState;

    const runSyncPass = () => {
      void runBackgroundCloudSyncPass();
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
