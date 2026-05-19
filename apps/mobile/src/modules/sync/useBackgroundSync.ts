import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDatabase } from '@/db';

import { pollEventUpdates } from './pollEventUpdates';
import { runUploadQueueWorker } from './uploadQueueWorker';

export function useBackgroundSync(): void {
  useEffect(() => {
    let appState: AppStateStatus = AppState.currentState;

    const runSyncPass = () => {
      void getDatabase().then(async (database) => {
        await runUploadQueueWorker(database);
        await pollEventUpdates(database);
      });
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.match(/inactive|background/) && nextState === 'active') {
        runSyncPass();
      }

      appState = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
