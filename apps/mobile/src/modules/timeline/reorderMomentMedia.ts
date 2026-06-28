import type * as SQLite from 'expo-sqlite';

import { acquireEventSyncLock } from '@/db/eventSyncLock';
import { setPrimaryAssetForEvent } from '@/db/localMediaScores';
import { getLocalEventById } from '@/db/localEvents';
import { updateLocalEventSelectedAssetIds } from '@/db/reconcilePromotedEventMedia';

import { scheduleCloudSyncForMoment } from './scheduleCloudSyncForMoment';

export function isSameAssetIdSet(
  currentIds: readonly string[],
  nextIds: readonly string[],
): boolean {
  if (currentIds.length !== nextIds.length) {
    return false;
  }

  const current = new Set(currentIds);

  return nextIds.every((id) => current.has(id));
}

export function moveAssetIdInOrder(
  orderedIds: readonly string[],
  fromIndex: number,
  direction: 'up' | 'down',
): string[] | null {
  const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

  if (fromIndex < 0 || fromIndex >= orderedIds.length) {
    return null;
  }

  if (targetIndex < 0 || targetIndex >= orderedIds.length) {
    return null;
  }

  const next = [...orderedIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

/**
 * Moves the asset at `fromIndex` to `toIndex` (clamped into range), returning the
 * reordered id list, or `null` when the move is a no-op or out of bounds. Used by
 * the drag-to-reorder gallery and its accessibility move actions.
 */
export function moveAssetToIndex(
  orderedIds: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] | null {
  if (fromIndex < 0 || fromIndex >= orderedIds.length) {
    return null;
  }

  const targetIndex = Math.max(0, Math.min(orderedIds.length - 1, toIndex));

  if (targetIndex === fromIndex) {
    return null;
  }

  const next = [...orderedIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export async function reorderMomentMedia(
  database: SQLite.SQLiteDatabase,
  localEventId: string,
  orderedAssetIds: string[],
): Promise<boolean> {
  const local = await getLocalEventById(database, localEventId);

  if (!local || local.deletedAt) {
    return false;
  }

  const currentIds = parseSelectedAssetIds(local.selectedAssetIds);

  if (
    orderedAssetIds.length === 0 ||
    !isSameAssetIdSet(currentIds, orderedAssetIds)
  ) {
    return false;
  }

  const primaryAssetId = orderedAssetIds[0];

  if (!primaryAssetId) {
    return false;
  }

  await acquireEventSyncLock(database, localEventId, 'user');
  await updateLocalEventSelectedAssetIds(
    database,
    localEventId,
    orderedAssetIds,
  );
  await setPrimaryAssetForEvent(database, localEventId, primaryAssetId);

  await database.runAsync(
    `
      UPDATE local_events
      SET
        pending_cloud_sync = 1,
        sync_lock_owner = 'user',
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [localEventId],
  );

  scheduleCloudSyncForMoment(localEventId);
  return true;
}

function parseSelectedAssetIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
