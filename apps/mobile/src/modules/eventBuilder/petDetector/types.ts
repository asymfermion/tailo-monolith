import type { LocalAssetDetectionInput } from '@/db/localAssets';

export type DetectionSource =
  | 'native'
  | 'heuristic'
  | 'timeout_heuristic';
import type { DetectedPetType } from '@/types';

export type PetDetectorInput = LocalAssetDetectionInput;

export type PetDetectorResult = {
  isPetCandidate: boolean;
  detectedPetType: DetectedPetType | null;
  confidence: number;
  detectionSource: DetectionSource;
  detectionDebugLabel: string | null;
};

export type PetDetector = {
  detect: (asset: PetDetectorInput) => Promise<PetDetectorResult>;
};
