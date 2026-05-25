import type * as SQLite from 'expo-sqlite';
import { UPLOAD_MAX_ASSETS_PER_EVENT } from '@tailo/shared';
import * as FileSystem from 'expo-file-system/legacy';

import { getDatabase, invalidateDatabaseConnection } from '@/db';
import { formatDbError, isClosedDatabaseError } from '@/db/dbLogger';
import { getLocalAssetUploadSourcesByIds } from '@/db/localAssets';
import { getLocalEventById } from '@/db/localEvents';
import {
  getPendingUploadQueueItems,
  markUploadQueueItemDone,
  markUploadQueueItemFailed,
  markUploadQueueItemsUploading,
  resetStuckUploadingQueueItems,
  type UploadQueueRow,
} from '@/db/uploadQueue';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';

import { logTailo } from '@/lib/tailoLogger';

import { prepareCloudUploadPrerequisites } from './prepareCloudUploadPrerequisites';

import { createUploadUrls } from './createUploadUrls';
import { groupUploadQueueByEvent } from './groupUploadQueueByEvent';
import { prepareEventMediaUpload } from './prepareEventMediaUpload';
import { canRetryUpload, getNextUploadAttemptAt } from './uploadRetry';
import { runPendingCloudSyncForEvent } from './runPendingCloudSync';
import { uploadToSignedUrl } from './uploadToSignedUrl';

export type RunUploadQueueWorkerResult = {
  processedBatches: number;
  uploadedAssets: number;
  failedAssets: number;
  skippedReason: string | null;
};

type PreparedAssetUpload = {
  queueItem: UploadQueueRow;
  sourceLocalAssetId: string;
  contentLength: number;
  width: number;
  height: number;
  originalUri: string;
  thumbnailUri: string;
  mediaFingerprint: string | null;
};

export async function runUploadQueueWorker(
  databaseArg?: SQLite.SQLiteDatabase,
): Promise<RunUploadQueueWorkerResult> {
  if (!isRemoteAuthConfigured()) {
    logTailo('Upload', 'Cloud upload worker skipped', {
      reason: 'remote_auth_unconfigured',
    });
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: 'remote_auth_unconfigured',
    };
  }

  const prepared = await prepareCloudUploadPrerequisites();
  const session = await getAuthSession();

  if (!session) {
    logTailo('Upload', 'Cloud upload worker skipped', {
      reason: 'missing_session',
    });
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: 'missing_session',
    };
  }

  const remotePetId =
    prepared.remotePetId ?? (await loadLocalPetProfile())?.remotePetId ?? null;

  if (!remotePetId) {
    logTailo('Upload', 'Cloud upload worker skipped', {
      reason: 'missing_remote_pet',
    });
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: 'missing_remote_pet',
    };
  }

  const database = databaseArg ?? (await resolveUploadWorkerDatabase());

  await resetStuckUploadingQueueItems(database);

  const pendingRows = await getPendingUploadQueueItems(database);
  const batches = groupUploadQueueByEvent(pendingRows);

  if (batches.length === 0) {
    return {
      processedBatches: 0,
      uploadedAssets: 0,
      failedAssets: 0,
      skippedReason: null,
    };
  }

  logTailo('Upload', 'Cloud upload worker started', {
    pendingEventBatches: batches.length,
    pendingQueueItems: pendingRows.length,
  });

  let processedBatches = 0;
  let uploadedAssets = 0;
  let failedAssets = 0;

  for (const batch of batches) {
    const batchResult = await processUploadBatch(
      database,
      batch.localEventId,
      batch.items,
      remotePetId,
    );

    processedBatches += batchResult.processed ? 1 : 0;
    uploadedAssets += batchResult.uploadedAssets;
    failedAssets += batchResult.failedAssets;
  }

  if (processedBatches > 0 || failedAssets > 0) {
    logTailo('Upload', 'Cloud upload worker finished', {
      processedBatches,
      uploadedAssets,
      failedAssets,
    });
  }

  return {
    processedBatches,
    uploadedAssets,
    failedAssets,
    skippedReason: null,
  };
}

async function processUploadBatch(
  database: SQLite.SQLiteDatabase,
  localEventId: string,
  queueItems: UploadQueueRow[],
  remotePetId: string,
): Promise<{
  processed: boolean;
  uploadedAssets: number;
  failedAssets: number;
}> {
  if (queueItems.length === 0) {
    return { processed: false, uploadedAssets: 0, failedAssets: 0 };
  }

  if (queueItems.length > UPLOAD_MAX_ASSETS_PER_EVENT) {
    await failQueueItems(
      database,
      queueItems,
      `Too many assets in upload batch (${queueItems.length}).`,
    );
    return {
      processed: true,
      uploadedAssets: 0,
      failedAssets: queueItems.length,
    };
  }

  const localEvent = await getLocalEventById(database, localEventId);

  if (!localEvent) {
    await failQueueItems(database, queueItems, 'Local event not found.');
    return {
      processed: true,
      uploadedAssets: 0,
      failedAssets: queueItems.length,
    };
  }

  const localAssets = await getLocalAssetUploadSourcesByIds(
    database,
    queueItems.map((item) => item.localAssetId),
  );
  const assetsById = new Map(
    localAssets.map((asset) => [asset.localAssetId, asset]),
  );

  await markUploadQueueItemsUploading(
    database,
    queueItems.map((item) => item.id),
  );

  try {
    const preparedUploads: PreparedAssetUpload[] = [];

    for (const queueItem of queueItems) {
      const asset = assetsById.get(queueItem.localAssetId);

      if (!asset) {
        throw new Error(`Missing local asset ${queueItem.localAssetId}.`);
      }

      const prepared = await prepareEventMediaUpload({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });

      preparedUploads.push({
        queueItem,
        sourceLocalAssetId: queueItem.localAssetId,
        contentLength: prepared.original.byteSize,
        width: prepared.original.width,
        height: prepared.original.height,
        originalUri: prepared.original.uri,
        thumbnailUri: prepared.thumbnail.uri,
        mediaFingerprint: await resolveMediaFingerprint(prepared.original.uri),
      });
    }

    const urlResult = await createUploadUrls({
      pet_id: remotePetId,
      source_local_event_id: localEventId,
      assets: preparedUploads.map((upload) => ({
        source_local_asset_id: upload.sourceLocalAssetId,
        content_length: upload.contentLength,
        width: upload.width,
        height: upload.height,
      })),
    });

    if (urlResult.status === 'error') {
      throw new Error(urlResult.message);
    }

    const signedAssetsById = new Map(
      urlResult.response.assets.map((asset) => [
        asset.source_local_asset_id,
        asset,
      ]),
    );

    let uploadedAssets = 0;

    for (const preparedUpload of preparedUploads) {
      const signedAsset = signedAssetsById.get(
        preparedUpload.sourceLocalAssetId,
      );

      if (!signedAsset) {
        throw new Error(
          `Missing signed URLs for ${preparedUpload.sourceLocalAssetId}.`,
        );
      }

      await uploadToSignedUrl(
        signedAsset.original_upload_url,
        preparedUpload.originalUri,
      );
      await uploadToSignedUrl(
        signedAsset.thumbnail_upload_url,
        preparedUpload.thumbnailUri,
      );

      await markUploadQueueItemDone(
        database,
        preparedUpload.queueItem.id,
        signedAsset.storage_path,
        signedAsset.thumbnail_path,
        preparedUpload.mediaFingerprint,
      );
      uploadedAssets += 1;
    }

    logTailo('Upload', 'Cloud media upload completed for moment', {
      localEventId,
      uploadedAssets,
      remoteEventId: urlResult.response.event_id,
      note: 'Existing local moment — not a new on-device discovery',
    });

    try {
      const syncResult = await runPendingCloudSyncForEvent(
        database,
        localEventId,
      );

      logTailo('Sync', 'Moment metadata sync finished', {
        localEventId,
        remoteEventId: urlResult.response.event_id,
        status: syncResult.status,
        message: syncResult.message,
      });
    } catch (syncError) {
      logTailo('Sync', 'Moment metadata sync failed after media upload', {
        localEventId,
        remoteEventId: urlResult.response.event_id,
        error:
          syncError instanceof Error ? syncError.message : String(syncError),
      });
    }

    return {
      processed: true,
      uploadedAssets,
      failedAssets: 0,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Upload batch failed.';

    await failQueueItems(database, queueItems, message);

    logTailo('Upload', 'Cloud media upload failed for moment', {
      localEventId,
      message,
      localAssetIds: queueItems.map((item) => item.localAssetId),
      note: 'Failed items stay in upload_queue and retry on next app open',
    });

    return {
      processed: true,
      uploadedAssets: 0,
      failedAssets: queueItems.length,
    };
  }
}

async function resolveMediaFingerprint(uri: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, {
      md5: true,
    } as Parameters<typeof FileSystem.getInfoAsync>[1]);

    if (!info.exists || typeof info.md5 !== 'string' || !info.md5) {
      return null;
    }

    return `md5:${info.md5}`;
  } catch {
    return null;
  }
}

async function failQueueItems(
  database: SQLite.SQLiteDatabase,
  queueItems: UploadQueueRow[],
  message: string,
): Promise<void> {
  for (const item of queueItems) {
    const nextRetryCount = item.retryCount + 1;
    const nextAttemptAt = canRetryUpload(nextRetryCount)
      ? getNextUploadAttemptAt(nextRetryCount)
      : null;

    await markUploadQueueItemFailed(
      database,
      item.id,
      message,
      nextRetryCount,
      nextAttemptAt,
    );
  }
}

async function resolveUploadWorkerDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    return await getDatabase();
  } catch (error) {
    if (isClosedDatabaseError(error)) {
      logTailo('Upload', 'Retrying upload worker database open after close', {
        error: formatDbError(error),
      });
      await invalidateDatabaseConnection();
      return getDatabase();
    }

    throw error;
  }
}
