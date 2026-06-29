import { acquireEventSyncLock } from '@/db/eventSyncLock';
import { dismissLocalAssetsForMoment } from '@/db/localAssets';
import { tombstoneLocalEvents } from '@/db/localEventTombstones';
import { getLocalEventById, markLocalEventDeleted } from '@/db/localEvents';
import { getLocalMediaScoresForEvent } from '@/db/localMediaScores';
import { getSyncStateValue, SYNC_STATE_KEYS } from '@/db/syncState';
import { cancelUploadQueueForEvent } from '@/db/uploadQueue';
import { getDatabase } from '@/db';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { deleteEvent } from '@/modules/sync/deleteEvent';

export type DeleteMomentResult =
  { ok: true; deletedAt: string } | { ok: false; errorMessage: string };

export async function deleteMoment(
  localEventId: string,
): Promise<DeleteMomentResult> {
  const database = await getDatabase();
  const local = await getLocalEventById(database, localEventId);

  if (!local || local.deletedAt) {
    return { ok: false, errorMessage: 'Moment not found.' };
  }

  const deletedAt = new Date().toISOString();

  await acquireEventSyncLock(database, localEventId, 'user');
  await markLocalEventDeleted(database, localEventId, deletedAt);

  const selectedAssetIds = parseSelectedAssetIds(local.selectedAssetIds);
  const scoredAssets = await getLocalMediaScoresForEvent(
    database,
    localEventId,
  );
  const allAssetIds = [
    ...new Set([
      ...selectedAssetIds,
      ...scoredAssets.map((s) => s.localAssetId),
    ]),
  ];
  await dismissLocalAssetsForMoment(database, allAssetIds, deletedAt);
  await cancelUploadQueueForEvent(database, localEventId);

  const generationRaw = await getSyncStateValue(
    database,
    SYNC_STATE_KEYS.TIMELINE_GENERATION,
  );
  const timelineGeneration = Number.parseInt(generationRaw ?? '0', 10) || 0;

  await tombstoneLocalEvents(
    database,
    [{ localEventId, remoteEventId: local.remoteEventId }],
    timelineGeneration,
    deletedAt,
  );

  if (isRemoteAuthConfigured() && (await getAuthSession())) {
    const cloudResult = await deleteEvent({
      source_local_event_id: localEventId,
    });

    if (cloudResult.status === 'error') {
      const notOnServer =
        cloudResult.message.toLowerCase().includes('not found') ||
        cloudResult.message.includes('404');

      if (!notOnServer) {
        return { ok: false, errorMessage: cloudResult.message };
      }
    } else {
      await database.runAsync(
        `
          UPDATE local_events
          SET
            remote_event_id = COALESCE(remote_event_id, ?),
            server_sync_version = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE local_event_id = ?
        `,
        [
          cloudResult.response.event_id,
          cloudResult.response.server_sync_version,
          localEventId,
        ],
      );
    }
  }

  return { ok: true, deletedAt };
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
