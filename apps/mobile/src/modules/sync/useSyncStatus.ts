import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDatabase } from '@/db';
import { countPendingUploadQueueItems } from '@/db/uploadQueue';

import { hasPendingAiEvents } from './pollEventUpdates';

export type SyncStatusState = {
  hasPendingMemories: boolean;
  isSyncing: boolean;
};

export function useSyncStatus(options: {
  isPolling: boolean;
}): SyncStatusState {
  const { isPolling } = options;
  const [pendingUploads, setPendingUploads] = useState(0);
  const [pendingAi, setPendingAi] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refresh = useCallback(async () => {
    if (appState.current !== 'active') {
      return;
    }

    const database = await getDatabase();
    const [uploadCount, aiPending] = await Promise.all([
      countPendingUploadQueueItems(database),
      hasPendingAiEvents(database),
    ]);
    setPendingUploads((current) =>
      current === uploadCount ? current : uploadCount,
    );
    setPendingAi((current) => (current === aiPending ? current : aiPending));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appState.current = nextState;

      if (nextState === 'active') {
        void refresh();
      }
    });

    const interval = setInterval(() => {
      void refresh();
    }, 5_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [refresh]);

  const hasPendingMemories = pendingUploads > 0 || pendingAi;

  return {
    hasPendingMemories,
    isSyncing: isPolling || pendingUploads > 0,
  };
}
