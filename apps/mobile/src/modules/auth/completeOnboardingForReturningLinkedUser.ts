import { hasReadyLocalPetProfile } from '@/modules/pets';

import { isAuthRequireLogin } from './authRequireLogin';
import { logAuth } from './authLogger';
import { getAuthProvider } from './authProviderInstance';
import { isLinkedRemoteAccount, type AuthSession } from './authTypes';
import type { EnsureCurrentUserIfNeededResult } from './ensureCurrentUser';
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
} from './onboardingState';

/** Sign-in entry points where the user is reconnecting an existing account. */
export const EXPLICIT_RETURNING_SIGN_IN_SOURCES = new Set([
  'sign_in_with_password',
  'verify_sign_in_otp',
  'password_reset',
]);

export type CompleteOnboardingForReturningLinkedUserOptions = {
  source?: string;
  ensureResult?: EnsureCurrentUserIfNeededResult;
  /** Captured before workspace DB open; used if provider session was cleared. */
  signedInSession?: AuthSession | null;
};

function isReturningCloudAccount(
  ensureResult: EnsureCurrentUserIfNeededResult | undefined,
): boolean {
  return (
    ensureResult?.status === 'ensured' &&
    !ensureResult.response.created_app_user
  );
}

function isExplicitReturningSignIn(source: string | undefined): boolean {
  return source != null && EXPLICIT_RETURNING_SIGN_IN_SOURCES.has(source);
}

/**
 * Returning linked users can skip the onboarding gate when they already finished
 * device setup (local pet profile) or sign in to an existing cloud account from
 * the login screen. New sign-ups and in-app email linking stay on onboarding
 * until photo scan and pet setup complete on this device.
 */
export async function completeOnboardingForReturningLinkedUser(
  options: CompleteOnboardingForReturningLinkedUserOptions = {},
): Promise<boolean> {
  if (await isAuthRequireLogin()) {
    return false;
  }

  const session =
    (await getAuthProvider().getSession()) ?? options.signedInSession ?? null;
  const linked = isLinkedRemoteAccount(session);
  const canCompleteForReturningSignIn =
    isExplicitReturningSignIn(options.source) &&
    isReturningCloudAccount(options.ensureResult) &&
    Boolean(session?.email && !session.isAnonymous);

  if (!linked && !canCompleteForReturningSignIn) {
    logAuth('Linked sign-in: session not ready to skip onboarding', {
      source: options.source ?? null,
      hasSession: Boolean(session),
      isAnonymous: session?.isAnonymous ?? null,
      emailConfirmed: session?.emailConfirmed ?? null,
    });
    return false;
  }

  const storedState = await loadOnboardingState();

  if (storedState.completed) {
    return false;
  }

  const hasLocalPet = await hasReadyLocalPetProfile();
  const canSkipForReturningSignIn =
    isExplicitReturningSignIn(options.source) &&
    isReturningCloudAccount(options.ensureResult);

  if (!hasLocalPet && !canSkipForReturningSignIn) {
    logAuth(
      'Linked sign-in: keeping device onboarding — no local pet profile yet',
      {
        source: options.source ?? null,
        returningCloudAccount: isReturningCloudAccount(options.ensureResult),
      },
    );
    return false;
  }

  const nextState = mergeOnboardingState(storedState, {
    step: 'complete',
    completed: true,
    completionSource: 'returning_account',
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
