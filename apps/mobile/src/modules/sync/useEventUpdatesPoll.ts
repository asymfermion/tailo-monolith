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
  onApplied?: () => void;
}): EventUpdatesPollState {
  const { enabled = true, onApplied } = options;
  const [isPolling, setIsPolling] = useState(false);
  const [lastAppliedCount, setLastAppliedCount] = useState(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const onAppliedRef = useRef(onApplied);
  const isPollingRef = useRef(false);

  onAppliedRef.current = onApplied;

  const pollOnce = useCallback(async () => {
    if (!enabled || appState.current !== 'active' || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    setIsPolling(true);

    try {
      const database = await getDatabase();
      const result = await pollEventUpdates(database);
      setLastAppliedCount(result.applied);

      if (result.applied > 0) {
        onAppliedRef.current?.();
      }
    } finally {
      isPollingRef.current = false;
      setIsPolling(false);
    }
  }, [enabled]);

  useEffect(() => {
    void pollOnce();
  }, [pollOnce]);

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
