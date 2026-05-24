import { getDatabase } from '@/db';
import { countLocalAssets } from '@/db/localAssets';
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
  hasLocalMediaData = true,
): OnboardingState {
  const hasPetProfile = Boolean(petProfile?.name?.trim() && petProfile?.type);
  const completedByReturningAccount =
    storedState.completed &&
    storedState.completionSource === 'returning_account';

  if ((hasPetProfile || completedByReturningAccount) && hasLocalMediaData) {
    return storedState;
  }

  if (!storedState.completed && storedState.step !== 'complete') {
    if (!hasLocalMediaData) {
      return {
        ...initialOnboardingState,
        step: 'welcome',
        completed: false,
        completedFlags: {
          ...initialOnboardingState.completedFlags,
          identityCreated: storedState.completedFlags.identityCreated,
        },
      };
    }

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
): Promise<OnboardingState> {
  const [petProfile, database] = await Promise.all([
    loadLocalPetProfile(),
    getDatabase(),
  ]);
  const localAssetCount = await countLocalAssets(database);

  return resolveOnboardingAfterLoad(
    storedState,
    petProfile,
    localAssetCount > 0,
  );
}
