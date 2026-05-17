import type { LocalAssetScoringInput } from '@/db/localAssets';

import { scoreEventMedia } from './mediaScoring';

function asset(
  localAssetId: string,
  index: number,
  petConfidence = 0.8,
): LocalAssetScoringInput {
  return {
    localAssetId,
    createdAt: `2026-05-17T03:${String(index).padStart(2, '0')}:00.000Z`,
    width: 1920,
    height: 1080,
    petConfidence,
    detectedPetType: 'cat',
  };
}

describe('scoreEventMedia', () => {
  it('scores every asset and marks exactly one primary image', () => {
    const result = scoreEventMedia({
      localEventId: 'event-1',
      assets: [asset('asset-1', 0), asset('asset-2', 6, 0.95)],
    });

    expect(result.scores).toHaveLength(2);
    expect(result.selectedAssetIds).toHaveLength(2);
    expect(result.primaryAssetId).toBeTruthy();
    expect(result.scores.filter((score) => score.isPrimary)).toHaveLength(1);
  });

  it('selects no more than five ranked images for an event', () => {
    const result = scoreEventMedia({
      localEventId: 'event-1',
      assets: Array.from({ length: 7 }, (_, index) =>
        asset(`asset-${index}`, index),
      ),
    });

    expect(result.scores).toHaveLength(7);
    expect(result.selectedAssetIds).toHaveLength(5);
  });
});
