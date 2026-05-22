import { getDatabase } from '@/db';
import { updateLocalEvent } from '@/db/localEvents';

import { scheduleCloudSyncForMoment } from './scheduleCloudSyncForMoment';

export async function toggleMomentFavorite(
  localEventId: string,
  isFavorite: boolean,
): Promise<boolean> {
  const database = await getDatabase();
  const saved = await updateLocalEvent(database, localEventId, { isFavorite });

  if (saved) {
    scheduleCloudSyncForMoment(localEventId);
  }

  return saved;
}
