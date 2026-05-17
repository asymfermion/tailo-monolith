import { useCallback, useEffect, useState } from 'react';

import { getDatabase } from '@/db';
import { getTimelineEvents } from '@/db/timelineEvents';
import type { TimelineEvent } from '@/types';

export type TimelineEventsState = {
  events: TimelineEvent[];
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
};

export function useTimelineEvents(refreshKey = 0): TimelineEventsState {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const database = await getDatabase();
      const nextEvents = await getTimelineEvents(database);
      setEvents(nextEvents);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not load moments yet.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return {
    events,
    isLoading,
    errorMessage,
    refresh,
  };
}
