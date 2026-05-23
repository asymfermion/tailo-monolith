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
} from './authTypes';
import {
  getAuthProvider,
  resetAuthProvider,
  setAuthProvider,
} from './authProviderInstance';
import { logAuth } from './authLogger';
import { notifyAuthSessionChanged } from './authSessionEvents';
import { completeEmailAccountConnection } from './completeEmailAccountConnection';
import { completeOnboardingForReturningLinkedUser } from './completeOnboardingForReturningLinkedUser';
import {
  clearTailoAppUserIdCache,
  ensureCurrentUserIfNeeded,
  getTailoAppUserId,
} from './ensureCurrentUser';

export { getAuthProvider, resetAuthProvider, setAuthProvider };

export function isRemoteAuthConfigured(): boolean {
  return getAuthProvider().isConfigured();
}

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

async function runDeferredEmailAccountBootstrap(source: string): Promise<void> {
  try {
    const bootstrap = await completeEmailAccountConnection();
    logAuth('Post-sign-in bootstrap finished', {
      source,
      status: bootstrap.status,
      ...(bootstrap.status === 'partial' ? { message: bootstrap.message } : {}),
    });
    notifyAuthSessionChanged();
    logAuth('Session listeners notified (after bootstrap)', { source });
  } catch (error) {
    logAuth('Post-sign-in bootstrap failed', {
      source,
      message:
        error instanceof Error ? error.message : 'Unknown bootstrap error.',
    });
  }
}

/** Clears login gate and updates UI immediately; cloud bootstrap continues in background. */
async function establishSignedInSession(source: string): Promise<void> {
  logAuth('Establishing signed-in session', { source });

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

  await completeOnboardingForReturningLinkedUser();

  notifyAuthSessionChanged();
  logAuth('Session listeners notified (early)', { source });

  void runDeferredEmailAccountBootstrap(source);
}

/** After password reset OTP, the recovery session is already active — finalize without re-sign-in. */
export async function finalizeConnectedSignIn(source: string): Promise<void> {
  return establishSignedInSession(source);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  if (await isAuthRequireLogin()) {
    return null;
  }

  const session = await getAuthProvider().getSession();

  if (!session) {
    return null;
  }

  const appUserId = await getTailoAppUserId();

  return appUserId ? { ...session, appUserId } : session;
}

export async function getAuthAccessToken(): Promise<string | null> {
  if (await isAuthRequireLogin()) {
    return null;
  }

  return getAuthProvider().getAccessToken();
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
    await establishSignedInSession('verify_email_link');
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
    await establishSignedInSession('verify_email_sign_up');
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
    await establishSignedInSession('verify_sign_in_otp');
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
    await establishSignedInSession('sign_in_with_password');
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
