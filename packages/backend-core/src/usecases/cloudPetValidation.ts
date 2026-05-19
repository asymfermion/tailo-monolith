import {
  isCloudPetValidationPassing,
  type AiCaptionResult,
} from '@tailo/shared';

export type PetValidationStatus = 'pending' | 'valid' | 'rejected';

export function resolvePetValidationStatus(
  result: AiCaptionResult,
  expectedPetType: 'dog' | 'cat',
): PetValidationStatus {
  return isCloudPetValidationPassing(result, expectedPetType)
    ? 'valid'
    : 'rejected';
}
