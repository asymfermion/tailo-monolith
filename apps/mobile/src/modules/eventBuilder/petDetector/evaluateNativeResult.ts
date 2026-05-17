import type { DetectedPetType } from '@/types';
import type { NativePetClassifierLabel } from '@/native/TailoPetClassifier';

import { MIN_PET_CONFIDENCE } from './constants';
import type { PetDetectorResult } from './types';

export function evaluateNativeClassification(
  label: NativePetClassifierLabel,
  confidence: number,
): PetDetectorResult {
  const detectedPetType = toDetectedPetType(label);
  const meetsConfidence = confidence >= MIN_PET_CONFIDENCE;
  const isPetCandidate = detectedPetType !== null && meetsConfidence;

  return {
    isPetCandidate,
    detectedPetType: isPetCandidate ? detectedPetType : null,
    confidence,
    detectionSource: 'native',
    detectionDebugLabel: meetsConfidence
      ? label
      : `${label}_low_confidence_${confidence.toFixed(3)}`,
  };
}

function toDetectedPetType(
  label: NativePetClassifierLabel,
): DetectedPetType | null {
  if (label === 'dog' || label === 'cat') {
    return label;
  }

  return null;
}
