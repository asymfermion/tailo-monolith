import type * as MediaLibrary from 'expo-media-library/legacy';

import type { NewLocalAsset } from '@/types';

export function mapMediaLibraryAssetToLocalAsset(
  asset: MediaLibrary.Asset,
): NewLocalAsset {
  return {
    localAssetId: asset.id,
    uri: asset.uri,
    createdAt: new Date(asset.creationTime).toISOString(),
    width: asset.width,
    height: asset.height,
    mediaType: 'photo',
  };
}
