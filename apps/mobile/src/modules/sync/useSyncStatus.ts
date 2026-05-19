import { useCallback, useEffect, useState } from 'react';

import { getDatabase } from '@/db';
import { countPendingUploadQueueItems } from '@/db/uploadQueue';

import { hasPendingAiEvents } from './pollEventUpdates';

export type SyncStatusState = {
  hasPendingMemories: boolean;
  isSyncing: boolean;
};

export function useSyncStatus(options: {
  isPolling: boolean;
  refreshKey?: number;
}): SyncStatusState {
  const { isPolling, refreshKey = 0 } = options;
  const [pendingUploads, setPendingUploads] = useState(0);
  const [pendingAi, setPendingAi] = useState(false);

  const refresh = useCallback(async () => {
    const database = await getDatabase();
    const [uploadCount, aiPending] = await Promise.all([
      countPendingUploadQueueItems(database),
      hasPendingAiEvents(database),
    ]);
    setPendingUploads(uploadCount);
    setPendingAi(aiPending);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey, isPolling]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 5_000);

    return () => {
      clearInterval(interval);
    };
  }, [refresh]);

  const hasPendingMemories = pendingUploads > 0 || pendingAi;

  return {
    hasPendingMemories,
    isSyncing: isPolling || pendingUploads > 0,
  };
}
