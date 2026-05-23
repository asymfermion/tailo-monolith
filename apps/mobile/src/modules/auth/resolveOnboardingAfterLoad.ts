import { loadLocalPetProfile, type LocalPetProfile } from '@/modules/pets';

import {
  initialOnboardingState,
  type OnboardingState,
} from './onboardingState';

/**
 * Ensures users with a stale "completed" flag but no saved pet profile
 * are sent back through pet setup (common after reinstall / partial setup).
 */
export function resolveOnboardingAfterLoad(
  storedState: OnboardingState,
  petProfile: LocalPetProfile | null,
  options: { allowCompletedWithoutLocalPet?: boolean } = {},
): OnboardingState {
  const hasPetProfile = Boolean(petProfile?.name?.trim() && petProfile?.type);

  if (hasPetProfile || options.allowCompletedWithoutLocalPet) {
    return storedState;
  }

  if (!storedState.completed && storedState.step !== 'complete') {
    return storedState;
  }

  const resumeStep = storedState.completedFlags.scanStarted
    ? petProfile?.type
      ? 'pet_profile'
      : 'pet_select'
    : storedState.completedFlags.photoPermissionHandled
      ? petProfile?.type
        ? 'pet_profile'
        : 'pet_type'
      : 'welcome';

  return {
    ...initialOnboardingState,
    step: resumeStep,
    completed: false,
    completedFlags: {
      ...initialOnboardingState.completedFlags,
      identityCreated: storedState.completedFlags.identityCreated,
      photoPermissionHandled: storedState.completedFlags.photoPermissionHandled,
      scanStarted: storedState.completedFlags.scanStarted,
      timelinePreviewSeen: storedState.completedFlags.timelinePreviewSeen,
    },
  };
}

export async function loadResolvedOnboardingState(
  storedState: OnboardingState,
  options: { allowCompletedWithoutLocalPet?: boolean } = {},
): Promise<OnboardingState> {
  const petProfile = await loadLocalPetProfile();
  return resolveOnboardingAfterLoad(storedState, petProfile, options);
}
