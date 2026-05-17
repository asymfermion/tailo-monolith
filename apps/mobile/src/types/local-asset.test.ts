import type { LocalAsset, NewLocalAsset } from './local-asset';

describe('LocalAsset types', () => {
  it('allows constructing a minimal new asset for insert', () => {
    const asset: NewLocalAsset = {
      localAssetId: 'asset-1',
      uri: 'file:///photo.jpg',
      createdAt: '2026-05-17T10:00:00.000Z',
      width: 1920,
      height: 1080,
      mediaType: 'photo',
    };

    expect(asset.localAssetId).toBe('asset-1');
    expect(asset.processingStatus).toBeUndefined();
  });

  it('allows a full processed asset shape', () => {
    const asset: LocalAsset = {
      localAssetId: 'asset-1',
      uri: 'file:///photo.jpg',
      createdAt: '2026-05-17T10:00:00.000Z',
      width: 1920,
      height: 1080,
      mediaType: 'photo',
      processingStatus: 'processed',
      processedAt: '2026-05-17T10:01:00.000Z',
      isPetCandidate: true,
      petConfidence: 0.92,
      detectedPetType: 'cat',
    };

    expect(asset.isPetCandidate).toBe(true);
    expect(asset.petConfidence).toBeGreaterThan(0);
    expect(asset.detectedPetType).toBe('cat');
  });
});
