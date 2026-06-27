import type { SyncEventRequest } from '@tailo/shared';

import type { LocalEventRow } from '@/db/localEvents';
import type { UploadQueueRow } from '@/db/uploadQueue';
import { getLocalAssetUploadSourcesByIds } from '@/db/localAssets';
import { getLocalMediaScoresForEvent } from '@/db/localMediaScores';
import { getTimelineGeneration } from '@/db/syncState';
import type * as SQLite from 'expo-sqlite';

export async function buildSyncEventPayload(
  database: SQLite.SQLiteDatabase,
  localEvent: LocalEventRow,
  uploadedItems: UploadQueueRow[],
  remotePetId: string,
): Promise<SyncEventRequest | null> {
  if (uploadedItems.length === 0) {
    return null;
  }

  const assets = await getLocalAssetUploadSourcesByIds(
    database,
    uploadedItems.map((item) => item.localAssetId),
  );
  const scores = await getLocalMediaScoresForEvent(
    database,
    localEvent.localEventId,
  );
  const primaryAssetId =
    scores.find((score) => score.isPrimary === 1)?.localAssetId ??
    uploadedItems[0]?.localAssetId;

  const media = uploadedItems
    .map((item) => {
      const asset = assets.find(
        (row) => row.localAssetId === item.localAssetId,
      );
      const score = scores.find(
        (row) => row.localAssetId === item.localAssetId,
      );

      if (!asset || !item.storagePath || !item.thumbnailPath) {
        return null;
      }

      return {
        source_local_asset_id: item.localAssetId,
        storage_path: item.storagePath,
        thumbnail_path: item.thumbnailPath,
        media_fingerprint: item.mediaFingerprint,
        width: asset.width,
        height: asset.height,
        is_primary: item.localAssetId === primaryAssetId,
        detected_pet_type: score?.detectedPetType ?? null,
        detected_breed: score?.detectedBreed ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (media.length === 0) {
    return null;
  }

  const hasUserCaption = Boolean(localEvent.caption?.trim());
  const clientTimelineGeneration = await getTimelineGeneration(database);

  return {
    source_local_event_id: localEvent.localEventId,
    pet_id: remotePetId,
    timestamp: localEvent.timestamp,
    source: localEvent.source,
    event_type: localEvent.eventType,
    caption: localEvent.caption,
    caption_source: hasUserCaption ? 'user' : 'placeholder',
    is_favorite: localEvent.isFavorite === 1,
    client_sync_version: localEvent.serverSyncVersion,
    client_timeline_generation: clientTimelineGeneration,
    user_edited: {
      caption: localEvent.userEditedCaption === 1,
      event_type: localEvent.userEditedEventType === 1,
    },
    media,
  };
}
