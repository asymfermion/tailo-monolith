import type { DetectedPetType } from '@/types';

import type { LocalPetType } from './petProfile';

/**
 * When the user has chosen dog or cat during onboarding, only that type
 * counts as their pet for timeline and pipeline (MVP single-pet).
 */
export function matchesProfilePetType(
  detectedPetType: DetectedPetType | null,
  profilePetType: LocalPetType | null | undefined,
): boolean {
  if (!profilePetType) {
    return true;
  }

  return detectedPetType === profilePetType;
}

export function isPetCandidateForProfile(
  isPetCandidate: boolean,
  detectedPetType: DetectedPetType | null,
  profilePetType: LocalPetType | null | undefined,
): boolean {
  if (!isPetCandidate) {
    return false;
  }

  return matchesProfilePetType(detectedPetType, profilePetType);
}
