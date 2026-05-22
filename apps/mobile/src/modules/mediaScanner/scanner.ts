import * as MediaLibrary from 'expo-media-library';

import { upsertLocalAssets } from '@/db/localAssets';
import type { getDatabase } from '@/db';

import { mapMediaLibraryAssetToLocalAsset } from './assetMapper';
import {
  normalizePhotoPermission,
  type PhotoPermissionResult,
} from './permissions';
import { setLastScanTimestamp } from './scanState';

const CAMERA_ROLL_PAGE_SIZE = 50;
const INITIAL_SCAN_WINDOW_DAYS = 28;
const OLDER_SCAN_MAX_PAGES = 4;

export type ScanProgress = {
  batchCount: number;
  scannedCount: number;
  persistedCount: number;
  hasNextPage: boolean;
  endCursor?: string;
};

export type ScanRecentPhotosOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  onProgress?: (progress: ScanProgress) => void | Promise<void>;
  pageSize?: number;
  /** Used for first-time / full rescans when `createdAfterMs` is not set. */
  windowDays?: number;
  /** When set, only assets created after this time are fetched (incremental). */
  createdAfterMs?: number | null;
  startAfter?: string;
};

export type ScanOlderPhotosOptions = ScanRecentPhotosOptions & {
  maxPages?: number;
};

export async function checkPhotoLibraryPermission(): Promise<PhotoPermissionResult> {
  const isAvailable = await MediaLibrary.isAvailableAsync();

  if (!isAvailable) {
    return { status: 'unavailable', canAskAgain: false };
  }

  const permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
  return normalizePhotoPermission(permission);
}

export async function requestPhotoLibraryPermission(): Promise<PhotoPermissionResult> {
  const permission = await MediaLibrary.requestPermissionsAsync(false, [
    'photo',
  ]);
  return normalizePhotoPermission(permission);
}

export async function scanRecentPhotos({
  database,
  onProgress,
  pageSize = CAMERA_ROLL_PAGE_SIZE,
  windowDays = INITIAL_SCAN_WINDOW_DAYS,
  createdAfterMs = null,
  startAfter,
}: ScanRecentPhotosOptions): Promise<ScanProgress> {
  const createdAfter =
    createdAfterMs ?? Date.now() - windowDays * 24 * 60 * 60 * 1000;
  let after: string | undefined = startAfter;
  let batchCount = 0;
  let scannedCount = 0;
  let persistedCount = 0;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      first: pageSize,
      after,
      createdAfter,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    const localAssets = page.assets.map(mapMediaLibraryAssetToLocalAsset);
    const savedCount = await upsertLocalAssets(database, localAssets);

    batchCount += 1;
    scannedCount += page.assets.length;
    persistedCount += savedCount;
    hasNextPage = page.hasNextPage;
    after = page.endCursor;

    await onProgress?.({
      batchCount,
      scannedCount,
      persistedCount,
      hasNextPage,
      endCursor: page.endCursor,
    });

    if (!page.endCursor || page.assets.length === 0) {
      hasNextPage = false;
    }
  }

  if (scannedCount > 0) {
    await setLastScanTimestamp(new Date().toISOString());
  }

  return {
    batchCount,
    scannedCount,
    persistedCount,
    hasNextPage,
    endCursor: after,
  };
}

export async function scanOlderPhotos({
  database,
  onProgress,
  pageSize = CAMERA_ROLL_PAGE_SIZE,
  windowDays = INITIAL_SCAN_WINDOW_DAYS,
  maxPages = OLDER_SCAN_MAX_PAGES,
}: ScanOlderPhotosOptions): Promise<ScanProgress> {
  const createdBefore = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  let after: string | undefined;
  let batchCount = 0;
  let scannedCount = 0;
  let persistedCount = 0;
  let hasNextPage = true;

  while (hasNextPage && batchCount < maxPages) {
    const page = await MediaLibrary.getAssetsAsync({
      first: pageSize,
      after,
      createdBefore,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    const localAssets = page.assets.map(mapMediaLibraryAssetToLocalAsset);
    const savedCount = await upsertLocalAssets(database, localAssets);

    batchCount += 1;
    scannedCount += page.assets.length;
    persistedCount += savedCount;
    hasNextPage = page.hasNextPage;
    after = page.endCursor;

    await onProgress?.({
      batchCount,
      scannedCount,
      persistedCount,
      hasNextPage,
      endCursor: page.endCursor,
    });

    if (!page.endCursor || page.assets.length === 0) {
      hasNextPage = false;
    }
  }

  if (scannedCount > 0) {
    await setLastScanTimestamp(new Date().toISOString());
  }

  return {
    batchCount,
    scannedCount,
    persistedCount,
    hasNextPage,
    endCursor: after,
  };
}
