import { useCallback, useEffect, useRef, useState } from 'react';

import { getDatabase } from '@/db';
import { t } from '@/i18n';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';
import type { TimelineEvent } from '@/types';

import { loadTimelineForDisplay } from './loadTimelineForDisplay';

export type UseTimelineEventsOptions = {
  refreshKey?: number;
  favoritesOnly?: boolean;
};

export type TimelineEventsState = {
  events: TimelineEvent[];
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
};

export function useTimelineEvents(
  options: UseTimelineEventsOptions = {},
): TimelineEventsState {
  const { refreshKey = 0, favoritesOnly = false } = options;
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const eventsRef = useRef(events);
  const refreshGenerationRef = useRef(0);
  eventsRef.current = events;

  const refresh = useCallback(async () => {
    const generation = refreshGenerationRef.current + 1;
    refreshGenerationRef.current = generation;

    if (eventsRef.current.length === 0) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const database = await getDatabase();
      const profile = await loadLocalPetProfile();

      if (generation !== refreshGenerationRef.current) {
        return;
      }

      if (!profile?.type) {
        setEvents([]);
        return;
      }

      const nextEvents = await loadTimelineForDisplay(database, {
        favoritesOnly,
        profilePetType: profile.type,
      });

      if (generation !== refreshGenerationRef.current) {
        return;
      }

      setEvents(nextEvents);
    } catch (error) {
      if (generation !== refreshGenerationRef.current) {
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('errors.couldNotLoadMoments'),
      );
    } finally {
      if (generation === refreshGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, [favoritesOnly]);

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
