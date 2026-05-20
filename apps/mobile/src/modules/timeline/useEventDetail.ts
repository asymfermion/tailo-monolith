import { useCallback, useEffect, useState } from 'react';

import { getDatabase } from '@/db';
import { t } from '@/i18n';
import { updateLocalEvent, type LocalEventUpdate } from '@/db/localEvents';
import { getTimelineEventById } from '@/db/timelineEvents';
import { loadLocalPetProfile } from '@/modules/pets';
import type { TimelineEvent } from '@/types';

export type EventDetailState = {
  event: TimelineEvent | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  saveUpdate: (update: LocalEventUpdate) => Promise<boolean>;
};

export function useEventDetail(localEventId: string): EventDetailState {
  const [event, setEvent] = useState<TimelineEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEvent = useCallback(
    async (options: { showLoading: boolean }) => {
      if (options.showLoading) {
        setIsLoading(true);
      }

      setErrorMessage(null);

      try {
        const database = await getDatabase();
        const profile = await loadLocalPetProfile();
        if (!profile?.type) {
          setEvent(null);
          setErrorMessage(t('errors.choosePetToViewMoment'));
          return;
        }

        const nextEvent = await getTimelineEventById(database, localEventId, {
          profilePetType: profile.type,
        });
        setEvent(nextEvent);

        if (!nextEvent) {
          setErrorMessage(t('errors.momentUnavailable'));
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('errors.couldNotLoadMoment'),
        );
      } finally {
        if (options.showLoading) {
          setIsLoading(false);
        }
      }
    },
    [localEventId],
  );

  const refresh = useCallback(async () => {
    await loadEvent({ showLoading: true });
  }, [loadEvent]);

  const saveUpdate = useCallback(
    async (update: LocalEventUpdate) => {
      setIsSaving(true);
      setErrorMessage(null);

      try {
        const database = await getDatabase();
        const saved = await updateLocalEvent(database, localEventId, {
          ...update,
          userEditedCaption: update.caption !== undefined ? true : undefined,
          userEditedEventType:
            update.eventType !== undefined ? true : undefined,
          captionSource: update.caption !== undefined ? 'user' : undefined,
        });

        if (!saved) {
          setErrorMessage(t('errors.couldNotSaveChanges'));
          return false;
        }

        await loadEvent({ showLoading: false });
        return true;
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('errors.couldNotSaveChanges'),
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [localEventId, loadEvent],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    event,
    isLoading,
    isSaving,
    errorMessage,
    refresh,
    saveUpdate,
  };
}
