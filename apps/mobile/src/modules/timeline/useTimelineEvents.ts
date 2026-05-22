import { useCallback, useEffect, useRef, useState } from 'react';

import { getDatabase } from '@/db';
import { t } from '@/i18n';
import { pruneLocalTimelineForProfilePetType } from '@/db/localEvents';
import { getTimelineEvents } from '@/db/timelineEvents';
import { getSyncStateValue, SYNC_STATE_KEYS } from '@/db/syncState';
import { rebuildPipelineForProfilePetType } from '@/modules/eventBuilder/rebuildPipelineForProfilePetType';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';
import type { TimelineEvent } from '@/types';

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
  eventsRef.current = events;

  const refresh = useCallback(async () => {
    if (eventsRef.current.length === 0) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const database = await getDatabase();
      const profile = await loadLocalPetProfile();

      if (profile?.type) {
        const filterApplied = await getSyncStateValue(
          database,
          SYNC_STATE_KEYS.PROFILE_PET_FILTER_APPLIED,
        );

        if (filterApplied !== profile.type) {
          await rebuildPipelineForProfilePetType(database, profile.type);
        } else {
          await pruneLocalTimelineForProfilePetType(database, profile.type);
        }
      }

      if (!profile?.type) {
        setEvents([]);
        return;
      }

      const nextEvents = await getTimelineEvents(database, {
        favoritesOnly,
        profilePetType: profile.type,
      });
      setEvents(nextEvents);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('errors.couldNotLoadMoments'),
      );
    } finally {
      setIsLoading(false);
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
