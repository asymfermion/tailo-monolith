import { hasReadyLocalPetProfile } from '@/modules/pets';

import { isAuthRequireLogin } from './authRequireLogin';
import { logAuth } from './authLogger';
import { getAuthProvider } from './authProviderInstance';
import { isLinkedRemoteAccount } from './authTypes';
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
} from './onboardingState';

/**
 * Returning linked users who already finished device setup (local pet profile)
 * can skip the onboarding gate and open the timeline. New direct sign-ups stay
 * on onboarding until photo scan and pet setup complete on this device.
 */
export async function completeOnboardingForReturningLinkedUser(): Promise<boolean> {
  if (await isAuthRequireLogin()) {
    return false;
  }

  const session = await getAuthProvider().getSession();

  if (!isLinkedRemoteAccount(session)) {
    return false;
  }

  const storedState = await loadOnboardingState();

  if (storedState.completed) {
    return false;
  }

  if (!(await hasReadyLocalPetProfile())) {
    logAuth(
      'Linked sign-in: keeping device onboarding — no local pet profile yet',
    );
    return false;
  }

  const nextState = mergeOnboardingState(storedState, {
    step: 'complete',
    completed: true,
    completedFlags: {
      profilePhotoSuggested: true,
      scanStarted: true,
      timelinePreviewSeen: true,
      petNameSet: true,
      petSelected: true,
      petTypeSet: true,
    },
  });

  await saveOnboardingState(nextState);
  logAuth('Onboarding marked complete for returning linked user');

  return true;
}
