import {
  clearAuthRequireLogin,
  isAuthRequireLogin,
  setAuthRequireLogin,
} from './authRequireLogin';
import type {
  AuthSession,
  BootstrapAuthResult,
  LogoutResult,
  PasswordSignInResult,
  RequestEmailLinkResult,
  RequestEmailSignUpResult,
  RequestPasswordResetResult,
  RequestSignInResult,
  SetPasswordResult,
  SignOutResult,
  VerifyEmailLinkResult,
  VerifyEmailSignUpResult,
  VerifyPasswordResetResult,
  VerifySignInResult,
  SocialSignInResult,
} from './authTypes';
import { isLinkedRemoteAccount } from './authTypes';
import {
  getAuthProvider,
  resetAuthProvider,
  setAuthProvider,
} from './authProviderInstance';
import { logAuth } from './authLogger';
import { notifyAuthSessionChanged } from './authSessionEvents';
import { completeEmailAccountConnection } from './completeEmailAccountConnection';
import {
  completeOnboardingForReturningLinkedUser,
  EXPLICIT_RETURNING_SIGN_IN_SOURCES,
} from './completeOnboardingForReturningLinkedUser';
import { resetOnboardingForAccountSignInIntent } from './onboardingState';
import { clearTailoAppUserIdCache } from './appUserId';
import { ensureCurrentUserIfNeeded } from './ensureCurrentUser';
import {
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
} from './authSessionAccess';
import { ensureAnonymousCloudAccountIfNeeded } from './anonymousCloudAccount';
import { dismissAccountUpgradeNotifications } from '@/modules/notifications/notificationService';

import { applyIdentityDisplayNameIfMissing } from './remoteAccountProfile';

export { getAuthProvider, resetAuthProvider, setAuthProvider };
export { getAuthAccessToken, getAuthSession, isRemoteAuthConfigured };

export async function bootstrapAuthSession(): Promise<BootstrapAuthResult> {
  if (!getAuthProvider().isConfigured()) {
    return getAuthProvider().bootstrapSession();
  }

  if (await isAuthRequireLogin()) {
    try {
      await getAuthProvider().signOut();
    } catch {
      // Local login gate is the source of truth when sign-out fails offline.
    }

    return { status: 'logged_out' };
  }

  return getAuthProvider().bootstrapSession();
}

/** Clears login gate after workspace + account bootstrap so onboarding reads the right data. */
async function establishSignedInSession(
  source: string,
  signedInSession?: AuthSession | null,
): Promise<void> {
  logAuth('Establishing signed-in session', { source });

  const sessionSnapshot =
    signedInSession ?? (await getAuthProvider().getSession());

  await clearAuthRequireLogin();
  logAuth('Login-required gate cleared', { source });

  const ensureResult = await ensureCurrentUserIfNeeded();
  logAuth('Workspace ensure finished during sign-in', {
    source,
    status: ensureResult.status,
    ...(ensureResult.status === 'error'
      ? { message: ensureResult.message }
      : {}),
  });

  try {
    const bootstrap = await completeEmailAccountConnection();
    logAuth('Post-sign-in bootstrap finished', {
      source,
      status: bootstrap.status,
      ...(bootstrap.status === 'partial' ? { message: bootstrap.message } : {}),
    });
  } catch (error) {
    logAuth('Post-sign-in bootstrap failed', {
      source,
      message:
        error instanceof Error ? error.message : 'Unknown bootstrap error.',
    });
  }

  const appliedIdentityDisplayName = await applyIdentityDisplayNameIfMissing();
  if (appliedIdentityDisplayName) {
    logAuth('Applied identity display name to local profile', { source });
  }

  if (EXPLICIT_RETURNING_SIGN_IN_SOURCES.has(source)) {
    await resetOnboardingForAccountSignInIntent();
  }

  await completeOnboardingForReturningLinkedUser({
    source,
    ensureResult,
    signedInSession: sessionSnapshot,
  });

  const linkedSession =
    (await getAuthProvider().getSession()) ?? sessionSnapshot ?? null;

  if (isLinkedRemoteAccount(linkedSession)) {
    const dismissed = await dismissAccountUpgradeNotifications();
    if (dismissed > 0) {
      logAuth('Dismissed account-upgrade notifications after link', {
        source,
        dismissed,
      });
    }
  }

  notifyAuthSessionChanged();
  logAuth('Session listeners notified', { source });
}

/** After password reset OTP, the recovery session is already active — finalize without re-sign-in. */
export async function finalizeConnectedSignIn(source: string): Promise<void> {
  return establishSignedInSession(source);
}

/**
 * Returns the active remote session, bootstrapping an anonymous session when needed.
 * Anonymous bootstrap is deferred until the user has a ready local pet profile.
 * Call after `getDatabase()` so install identity reconciliation cannot race session writes.
 */
export async function ensureRemoteAuthSession(): Promise<AuthSession | null> {
  if (!getAuthProvider().isConfigured() || (await isAuthRequireLogin())) {
    return null;
  }

  const existing = await getAuthSession();

  if (existing) {
    return existing;
  }

  const accountResult = await ensureAnonymousCloudAccountIfNeeded();

  if (accountResult.status !== 'ready') {
    return null;
  }

  return accountResult.session;
}

export async function requestEmailLink(
  email: string,
): Promise<RequestEmailLinkResult> {
  return getAuthProvider().requestEmailLink(email);
}

export async function verifyEmailLink(
  email: string,
  token: string,
): Promise<VerifyEmailLinkResult> {
  const result = await getAuthProvider().verifyEmailLink(email, token);

  if (result.status === 'verified') {
    await establishSignedInSession('verify_email_link', result.session);
  }

  return result;
}

export async function requestEmailSignUp(
  email: string,
): Promise<RequestEmailSignUpResult> {
  return getAuthProvider().requestEmailSignUp(email);
}

export async function verifyEmailSignUp(
  email: string,
  token: string,
): Promise<VerifyEmailSignUpResult> {
  const result = await getAuthProvider().verifyEmailSignUp(email, token);

  if (result.status === 'verified') {
    await establishSignedInSession('verify_email_sign_up', result.session);
  }

  return result;
}

export async function setAccountPassword(
  password: string,
): Promise<SetPasswordResult> {
  return getAuthProvider().setPassword(password);
}

export async function requestSignInOtp(
  email: string,
): Promise<RequestSignInResult> {
  return getAuthProvider().requestSignInOtp(email);
}

export async function verifySignInOtp(
  email: string,
  token: string,
): Promise<VerifySignInResult> {
  logAuth('OTP sign-in verification started');
  const result = await getAuthProvider().verifySignInOtp(email, token);
  logAuth('OTP sign-in verification finished', { status: result.status });

  if (result.status === 'signed_in') {
    await establishSignedInSession('verify_sign_in_otp', result.session);
  }

  return result;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<PasswordSignInResult> {
  logAuth('Password sign-in started');
  const result = await getAuthProvider().signInWithPassword(email, password);
  logAuth('Password sign-in provider finished', {
    status: result.status,
    ...(result.status === 'error' ? { message: result.message } : {}),
  });

  if (result.status === 'signed_in') {
    await establishSignedInSession('sign_in_with_password', result.session);
  }

  return result;
}

export async function signInWithGoogle(
  options: {
    mode?: 'sign_in' | 'link';
    source?: string;
  } = {},
): Promise<SocialSignInResult> {
  const { mode = 'sign_in', source = 'sign_in_with_google' } = options;
  logAuth('Google sign-in started', { mode, source });
  const result = await getAuthProvider().signInWithGoogle({ mode });
  logAuth('Google sign-in provider finished', {
    mode,
    source,
    status: result.status,
    ...(result.status === 'error' ? { message: result.message } : {}),
  });

  if (result.status === 'signed_in') {
    await establishSignedInSession(source, result.session);
  }

  return result;
}

export async function signInWithApple(
  options: {
    mode?: 'sign_in' | 'link';
    source?: string;
  } = {},
): Promise<SocialSignInResult> {
  const { mode = 'sign_in', source = 'sign_in_with_apple' } = options;
  logAuth('Apple sign-in started', { mode, source });
  const result = await getAuthProvider().signInWithApple({ mode });
  logAuth('Apple sign-in provider finished', {
    mode,
    source,
    status: result.status,
    ...(result.status === 'error' ? { message: result.message } : {}),
  });

  if (result.status === 'signed_in') {
    await establishSignedInSession(source, result.session);
  }

  return result;
}

export async function requestPasswordReset(
  email: string,
): Promise<RequestPasswordResetResult> {
  return getAuthProvider().requestPasswordReset(email);
}

export async function verifyPasswordResetOtp(
  email: string,
  token: string,
): Promise<VerifyPasswordResetResult> {
  return getAuthProvider().verifyPasswordResetOtp(email, token);
}

export async function signOutRemoteSession(): Promise<SignOutResult> {
  return getAuthProvider().signOut();
}

/** Signs out and requires email sign-in before the app is usable again. */
export async function logoutRemoteAccount(): Promise<LogoutResult> {
  if (!getAuthProvider().isConfigured()) {
    return { status: 'skipped' };
  }

  const signOutResult = await getAuthProvider().signOut();

  if (signOutResult.status === 'error') {
    return signOutResult;
  }

  logAuth('Logout: requiring sign-in again');
  await setAuthRequireLogin();
  await clearTailoAppUserIdCache();
  notifyAuthSessionChanged();
  logAuth('Logout finished');
  return { status: 'signed_out' };
}
