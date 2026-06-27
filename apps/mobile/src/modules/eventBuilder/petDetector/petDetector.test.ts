import { coerceBreedLabel } from '@/db/detectedPetOptions';

import {
  createFallbackPetDetector,
  createPetDetector,
  heuristicPetDetector,
} from './index';
import type { PetDetectorInput, PetDetectorResult } from './types';

const asset: PetDetectorInput = {
  localAssetId: 'asset-1',
  uri: 'ph://asset-1',
  createdAt: '2026-05-17T03:30:00.000Z',
  width: 1920,
  height: 1080,
};

const MIN_CONFIDENCE = 0.35; // mirrors MIN_PET_CONFIDENCE in constants.ts

// Simulate what the Swift combined model returns for a given image scenario.
// Mirrors: classifyPet() → bundled/animals/classifier → evaluateNativeClassification()
function makeNativeDetector(
  label: 'cat' | 'dog' | 'other',
  confidence: number,
  breed?: string,
) {
  const isPet = (label === 'cat' || label === 'dog') && confidence >= MIN_CONFIDENCE;
  return {
    detect: async (): Promise<PetDetectorResult> => ({
      isPetCandidate: isPet,
      detectedPetType: isPet ? label : null,
      confidence,
      detectionSource: 'native' as const,
      detectionDebugLabel: label,
      detectedBreed: breed ?? null,
    }),
  };
}

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
          detectedBreed: null,
        }),
      },
    );

    await expect(detector.detect(asset)).resolves.toEqual({
      isPetCandidate: false,
      detectedPetType: null,
      confidence: 0.91,
      detectionSource: 'heuristic',
      detectionDebugLabel: 'heuristic_skip',
      detectedBreed: null,
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

describe('combined model — native + top-2 breed + pet selection pipeline', () => {
  // Each scenario represents a different image the Swift classifier might process:
  // label = pet type returned by bundled/animals/classifier
  // breed = second-ranked VNClassifyImageRequest label (top-2 approach)
  // coerced = what the pet selection screen should show after coerceBreedLabel

  const scenarios: Array<{
    name: string;
    label: 'cat' | 'dog' | 'other';
    confidence: number;
    breed?: string;
    expectedPetType: 'cat' | 'dog' | null;
    expectedBreedInPicker: string | null;
  }> = [
    {
      name: 'clear golden retriever photo',
      label: 'dog',
      confidence: 0.92,
      breed: 'golden_retriever',
      expectedPetType: 'dog',
      expectedBreedInPicker: 'golden_retriever',
    },
    {
      name: 'clear Persian cat photo',
      label: 'cat',
      confidence: 0.88,
      breed: 'Persian_cat',
      expectedPetType: 'cat',
      expectedBreedInPicker: 'Persian_cat',
    },
    {
      name: 'cat photo with dominant plant background (top-2 false positive)',
      label: 'cat',
      confidence: 0.55,
      breed: 'decorative_plant',
      expectedPetType: 'cat',
      expectedBreedInPicker: null, // coerced away
    },
    {
      name: 'cat photo with tool in scene',
      label: 'cat',
      confidence: 0.60,
      breed: 'tool',
      expectedPetType: 'cat',
      expectedBreedInPicker: null,
    },
    {
      name: 'dog photo labeled as conveyance',
      label: 'dog',
      confidence: 0.72,
      breed: 'conveyance',
      expectedPetType: 'dog',
      expectedBreedInPicker: null,
    },
    {
      name: 'indoor cat photo — indoor is second label',
      label: 'cat',
      confidence: 0.65,
      breed: 'indoor',
      expectedPetType: 'cat',
      expectedBreedInPicker: null,
    },
    {
      name: 'cat photo with no breed detected',
      label: 'cat',
      confidence: 0.80,
      breed: undefined,
      expectedPetType: 'cat',
      expectedBreedInPicker: null,
    },
    {
      name: 'low confidence cat — below detection floor',
      label: 'cat',
      confidence: 0.10,
      breed: undefined,
      expectedPetType: null, // below MIN_PET_CONFIDENCE (0.35)
      expectedBreedInPicker: null,
    },
    {
      // Swift never sets breed when no petLabel is found, so breed is always nil for non-pets
      name: 'non-pet image',
      label: 'other',
      confidence: 0.99,
      breed: undefined,
      expectedPetType: null,
      expectedBreedInPicker: null,
    },
  ];

  for (const scenario of scenarios) {
    it(scenario.name, async () => {
      const detector = createFallbackPetDetector(
        makeNativeDetector(scenario.label, scenario.confidence, scenario.breed),
        heuristicPetDetector,
      );

      const result = await detector.detect(asset);

      // Verify the detector output (what gets written to local_assets)
      expect(result.detectedPetType).toBe(scenario.expectedPetType);
      expect(result.detectedBreed).toBe(scenario.breed ?? null);

      // Verify what the pet selection screen would show after coerceBreedLabel
      expect(coerceBreedLabel(result.detectedBreed)).toBe(
        scenario.expectedBreedInPicker,
      );
    });
  }
});
