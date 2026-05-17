import { heuristicPetDetector } from './heuristicDetector';
import { nativePetDetector } from './nativePetDetector';
import type { PetDetector } from './types';

export type { PetDetector, PetDetectorInput, PetDetectorResult } from './types';
export { detectPetCandidate, heuristicPetDetector } from './heuristicDetector';
export { nativePetDetector } from './nativePetDetector';

export function createPetDetector({
  preferNative = true,
}: { preferNative?: boolean } = {}): PetDetector {
  if (!preferNative) {
    return heuristicPetDetector;
  }

  return createFallbackPetDetector(nativePetDetector, heuristicPetDetector);
}

export function createFallbackPetDetector(
  primaryDetector: PetDetector,
  fallbackDetector: PetDetector,
): PetDetector {
  return {
    detect: async (asset) => {
      try {
        const result = await primaryDetector.detect(asset);
        return {
          ...result,
          detectionSource: result.detectionSource ?? 'native',
        };
      } catch {
        const result = await fallbackDetector.detect(asset);
        return {
          ...result,
          detectionSource: 'heuristic',
        };
      }
    },
  };
}
