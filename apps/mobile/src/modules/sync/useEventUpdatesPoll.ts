import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getDatabase } from '@/db';

import { hasPendingAiEvents, pollEventUpdates } from './pollEventUpdates';

const POLL_INTERVAL_MS = 30_000;

export type EventUpdatesPollState = {
  isPolling: boolean;
  lastAppliedCount: number;
};

export function useEventUpdatesPoll(options: {
  enabled?: boolean;
  refreshKey?: number;
  onApplied?: () => void;
}): EventUpdatesPollState {
  const { enabled = true, refreshKey = 0, onApplied } = options;
  const [isPolling, setIsPolling] = useState(false);
  const [lastAppliedCount, setLastAppliedCount] = useState(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const pollOnce = useCallback(async () => {
    if (!enabled || appState.current !== 'active') {
      return;
    }

    setIsPolling(true);

    try {
      const database = await getDatabase();
      const result = await pollEventUpdates(database);
      setLastAppliedCount(result.applied);

      if (result.applied > 0) {
        onApplied?.();
      }
    } finally {
      setIsPolling(false);
    }
  }, [enabled, onApplied]);

  useEffect(() => {
    void pollOnce();
  }, [pollOnce, refreshKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      appState.current = nextState;

      if (nextState === 'active') {
        void pollOnce();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, pollOnce]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = setInterval(() => {
      void (async () => {
        const database = await getDatabase();

        if (!(await hasPendingAiEvents(database))) {
          return;
        }

        await pollOnce();
      })();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, pollOnce]);

  return {
    isPolling,
    lastAppliedCount,
  };
}
