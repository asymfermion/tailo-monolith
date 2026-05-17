import type { LocalAssetDetectionInput } from '@/db/localAssets';

import { detectPetCandidate } from './petHeuristic';

const baseAsset: LocalAssetDetectionInput = {
  localAssetId: 'asset-1',
  uri: 'ph://asset-1',
  createdAt: '2026-05-17T03:30:00.000Z',
  width: 1920,
  height: 1080,
};

describe('detectPetCandidate', () => {
  it('returns a stable confidence for the same asset', () => {
    const firstResult = detectPetCandidate(baseAsset);
    const secondResult = detectPetCandidate(baseAsset);

    expect(secondResult).toEqual(firstResult);
    expect(firstResult.petConfidence).toBeGreaterThanOrEqual(0);
    expect(firstResult.petConfidence).toBeLessThanOrEqual(1);
  });

  it('never marks heuristic fallback results as pet candidates', () => {
    const result = detectPetCandidate(baseAsset);

    expect(result.isPetCandidate).toBe(false);
    expect(result.detectedPetType).toBeNull();
  });
});
