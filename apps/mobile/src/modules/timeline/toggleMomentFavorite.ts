import { getDatabase } from '@/db';
import { updateLocalEvent } from '@/db/localEvents';

export async function toggleMomentFavorite(
  localEventId: string,
  isFavorite: boolean,
): Promise<boolean> {
  const database = await getDatabase();
  return updateLocalEvent(database, localEventId, { isFavorite });
}
