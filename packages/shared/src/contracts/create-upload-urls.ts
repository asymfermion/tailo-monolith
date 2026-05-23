import {
  UPLOAD_MAX_ASSETS_PER_EVENT,
  UPLOAD_MIN_ASSETS_PER_EVENT,
} from '../constants/upload.ts';

export type CreateUploadUrlsAssetInput = {
  source_local_asset_id: string;
  content_length?: number;
  width?: number;
  height?: number;
};

/** Payload for `api-events` action `create-upload-urls` */
export type CreateUploadUrlsRequest = {
  pet_id: string;
  source_local_event_id: string;
  assets: CreateUploadUrlsAssetInput[];
};

export type CreateUploadUrlsAssetResponse = {
  source_local_asset_id: string;
  original_upload_url: string;
  thumbnail_upload_url: string;
  storage_path: string;
  thumbnail_path: string;
  expires_at: string;
};

/** Success response from create-upload-urls */
export type CreateUploadUrlsResponse = {
  event_id: string;
  assets: CreateUploadUrlsAssetResponse[];
};

export function parseCreateUploadUrlsRequest(
  body: unknown,
): CreateUploadUrlsRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const petId = Reflect.get(body, 'pet_id');
  const sourceLocalEventId = Reflect.get(body, 'source_local_event_id');
  const assets = Reflect.get(body, 'assets');

  if (typeof petId !== 'string' || petId.trim() === '') {
    return null;
  }

  if (
    typeof sourceLocalEventId !== 'string' ||
    sourceLocalEventId.trim() === ''
  ) {
    return null;
  }

  if (!Array.isArray(assets)) {
    return null;
  }

  if (
    assets.length < UPLOAD_MIN_ASSETS_PER_EVENT ||
    assets.length > UPLOAD_MAX_ASSETS_PER_EVENT
  ) {
    return null;
  }

  const parsedAssets: CreateUploadUrlsAssetInput[] = [];
  const seenAssetIds = new Set<string>();

  for (const asset of assets) {
    if (!asset || typeof asset !== 'object') {
      return null;
    }

    const sourceLocalAssetId = Reflect.get(asset, 'source_local_asset_id');

    if (
      typeof sourceLocalAssetId !== 'string' ||
      sourceLocalAssetId.trim() === ''
    ) {
      return null;
    }

    const trimmedId = sourceLocalAssetId.trim();

    if (seenAssetIds.has(trimmedId)) {
      return null;
    }

    seenAssetIds.add(trimmedId);

    const contentLength = Reflect.get(asset, 'content_length');
    const width = Reflect.get(asset, 'width');
    const height = Reflect.get(asset, 'height');

    parsedAssets.push({
      source_local_asset_id: trimmedId,
      content_length:
        typeof contentLength === 'number' && contentLength > 0
          ? contentLength
          : undefined,
      width: typeof width === 'number' && width > 0 ? width : undefined,
      height: typeof height === 'number' && height > 0 ? height : undefined,
    });
  }

  return {
    pet_id: petId.trim(),
    source_local_event_id: sourceLocalEventId.trim(),
    assets: parsedAssets,
  };
}

export function isCreateUploadUrlsResponse(
  value: unknown,
): value is CreateUploadUrlsResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const eventId = Reflect.get(value, 'event_id');
  const assets = Reflect.get(value, 'assets');

  if (typeof eventId !== 'string' || !Array.isArray(assets)) {
    return false;
  }

  return assets.every((asset) => {
    if (!asset || typeof asset !== 'object') {
      return false;
    }

    return (
      typeof Reflect.get(asset, 'source_local_asset_id') === 'string' &&
      typeof Reflect.get(asset, 'original_upload_url') === 'string' &&
      typeof Reflect.get(asset, 'thumbnail_upload_url') === 'string' &&
      typeof Reflect.get(asset, 'storage_path') === 'string' &&
      typeof Reflect.get(asset, 'thumbnail_path') === 'string' &&
      typeof Reflect.get(asset, 'expires_at') === 'string'
    );
  });
}
