import type * as MediaLibrary from 'expo-media-library';

import { mapMediaLibraryAssetToLocalAsset } from './assetMapper';

describe('mapMediaLibraryAssetToLocalAsset', () => {
  it('maps Expo media-library assets to local asset inserts', () => {
    const asset: MediaLibrary.Asset = {
      albumId: 'album-1',
      creationTime: Date.UTC(2026, 4, 17, 3, 30),
      duration: 0,
      filename: 'IMG_0001.JPG',
      height: 1080,
      id: 'asset-1',
      mediaSubtypes: [],
      mediaType: 'photo',
      modificationTime: Date.UTC(2026, 4, 17, 3, 31),
      uri: 'ph://asset-1',
      width: 1920,
    };

    expect(mapMediaLibraryAssetToLocalAsset(asset)).toEqual({
      localAssetId: 'asset-1',
      uri: 'ph://asset-1',
      createdAt: '2026-05-17T03:30:00.000Z',
      width: 1920,
      height: 1080,
      mediaType: 'photo',
    });
  });
});
