import { t } from '@/i18n';

import { signInWithApple, signInWithGoogle } from './authService';
import type { SocialSignInResult } from './authTypes';
import { loadOnboardingState } from './onboardingState';

export type SocialSignInProvider = 'google' | 'apple';

export function isSocialSignInCancelMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('canceled') ||
    normalized.includes('cancelled') ||
    normalized.includes('user denied')
  );
}

export async function runSocialSignIn(options: {
  provider: SocialSignInProvider;
  source?: string;
  mode?: 'sign_in' | 'link';
}): Promise<SocialSignInResult> {
  const { provider, mode = 'sign_in' } = options;
  const source =
    options.source ??
    (provider === 'google' ? 'sign_in_with_google' : 'sign_in_with_apple');

  if (provider === 'google') {
    return signInWithGoogle({ source, mode });
  }

  return signInWithApple({ source, mode });
}

export async function handleOnboardingSocialSignInResult(
  result: SocialSignInResult,
  options: {
    startOnThisDevice: () => Promise<void>;
    setErrorMessage: (message: string | null) => void;
  },
): Promise<void> {
  if (result.status === 'skipped') {
    options.setErrorMessage(t('account.unavailableBody'));
    return;
  }

  if (result.status === 'error') {
    return;
  }

  if (result.status !== 'signed_in') {
    return;
  }

  const onboarding = await loadOnboardingState();
  if (!onboarding.completed) {
    await options.startOnThisDevice();
  }
}

export function handleLoginSocialSignInResult(
  result: SocialSignInResult,
  options: {
    setErrorMessage: (message: string | null) => void;
    onSignedIn: () => void;
    finishSignIn: () => void;
  },
): void {
  if (result.status === 'skipped') {
    options.setErrorMessage(t('account.errors.unavailable'));
    return;
  }

  if (result.status === 'error') {
    return;
  }

  if (result.status !== 'signed_in') {
    return;
  }

  options.finishSignIn();
  options.onSignedIn();
}
