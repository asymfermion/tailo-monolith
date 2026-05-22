import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDatabase } from '@/db';
import { logTailo } from '@/lib/tailoLogger';

import { pollEventUpdates } from './pollEventUpdates';
import { runPendingCloudSync } from './runPendingCloudSync';
import { runUploadQueueWorker } from './uploadQueueWorker';

export function useBackgroundSync(): void {
  useEffect(() => {
    let appState: AppStateStatus = AppState.currentState;

    const runSyncPass = () => {
      logTailo('Sync', 'Foreground cloud sync pass started');
      void getDatabase().then(async (database) => {
        await runUploadQueueWorker(database);
        await runPendingCloudSync(database);
        await pollEventUpdates(database);
        logTailo('Sync', 'Foreground cloud sync pass finished');
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
