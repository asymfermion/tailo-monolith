import { classifyPetImage } from '@/native/TailoPetClassifier';

import { evaluateNativeClassification } from './evaluateNativeResult';
import type { PetDetector } from './types';

export const nativePetDetector: PetDetector = {
  detect: async (asset) => {
    const result = await classifyPetImage(asset.uri);
    return evaluateNativeClassification(
      result.label,
      result.confidence,
      result.breed,
    );
  },
};
