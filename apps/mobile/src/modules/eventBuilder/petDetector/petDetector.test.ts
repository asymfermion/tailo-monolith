import {
  createFallbackPetDetector,
  createPetDetector,
  heuristicPetDetector,
} from './index';
import type { PetDetectorInput } from './types';

const asset: PetDetectorInput = {
  localAssetId: 'asset-1',
  uri: 'ph://asset-1',
  createdAt: '2026-05-17T03:30:00.000Z',
  width: 1920,
  height: 1080,
};

describe('heuristicPetDetector', () => {
  it('returns dog/cat/null detection results without native ML', async () => {
    const result = await heuristicPetDetector.detect(asset);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(
      result.detectedPetType === null ||
        result.detectedPetType === 'dog' ||
        result.detectedPetType === 'cat',
    ).toBe(true);
  });
});

describe('createFallbackPetDetector', () => {
  it('falls back when a primary detector fails', async () => {
    const detector = createFallbackPetDetector(
      {
        detect: async () => {
          throw new Error('native unavailable');
        },
      },
      {
        detect: async () => ({
          isPetCandidate: false,
          detectedPetType: null,
          confidence: 0.91,
          detectionSource: 'heuristic',
          detectionDebugLabel: 'heuristic_skip',
        }),
      },
    );

    await expect(detector.detect(asset)).resolves.toEqual({
      isPetCandidate: false,
      detectedPetType: null,
      confidence: 0.91,
      detectionSource: 'heuristic',
      detectionDebugLabel: 'heuristic_skip',
    });
  });
});

describe('createPetDetector', () => {
  it('uses the heuristic detector by default', async () => {
    await expect(createPetDetector().detect(asset)).resolves.toEqual(
      await heuristicPetDetector.detect(asset),
    );
  });
});
