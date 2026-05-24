import type * as SQLite from 'expo-sqlite';

import { getTimelineEvents } from '@/db/timelineEvents';
import { waitForLocalPipelineIdle } from '@/db/localPipelineLock';
import { reconcilePromotedEventMediaForProfile } from '@/db/reconcilePromotedEventMedia';
import { getSyncStateValue, SYNC_STATE_KEYS } from '@/db/syncState';
import { rebuildPipelineForProfilePetType } from '@/modules/eventBuilder/rebuildPipelineForProfilePetType';
import type { LocalPetType } from '@/modules/pets/petProfile';
import type { TimelineEvent } from '@/types';

export type LoadTimelineForDisplayOptions = {
  favoritesOnly?: boolean;
  profilePetType: LocalPetType;
};

/**
 * Loads timeline moments after pipeline work is idle and local media rows are
 * reconciled with each event's selected assets.
 */
export async function loadTimelineForDisplay(
  database: SQLite.SQLiteDatabase,
  options: LoadTimelineForDisplayOptions,
): Promise<TimelineEvent[]> {
  await waitForLocalPipelineIdle();

  const filterApplied = await getSyncStateValue(
    database,
    SYNC_STATE_KEYS.PROFILE_PET_FILTER_APPLIED,
  );

  if (filterApplied !== options.profilePetType) {
    await rebuildPipelineForProfilePetType(database, options.profilePetType);
  } else {
    await reconcilePromotedEventMediaForProfile(
      database,
      options.profilePetType,
    );
  }

  await waitForLocalPipelineIdle();

  return getTimelineEvents(database, {
    favoritesOnly: options.favoritesOnly,
    profilePetType: options.profilePetType,
  });
}
