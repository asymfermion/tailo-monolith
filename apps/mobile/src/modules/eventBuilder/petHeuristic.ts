import type { LocalAssetDetectionInput } from '@/db/localAssets';

import { detectPetCandidate as detectWithHeuristicPetDetector } from './petDetector';

export type PetDetectionResult = {
  isPetCandidate: boolean;
  detectedPetType: 'dog' | 'cat' | null;
  petConfidence: number;
};

export function detectPetCandidate(
  asset: LocalAssetDetectionInput,
): PetDetectionResult {
  const result = detectWithHeuristicPetDetector(asset);

  return {
    isPetCandidate: result.isPetCandidate,
    detectedPetType: result.detectedPetType,
    petConfidence: result.confidence,
  };
}
