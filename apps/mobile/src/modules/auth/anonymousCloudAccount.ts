import { hasPersistedSupabaseAuthBlob } from '@/lib/supabaseAuthStorage';
import { hasReadyLocalPetProfile } from '@/modules/pets/petProfile';

import { logAuth } from './authLogger';
import { isAuthRequireLogin } from './authRequireLogin';
import { getAuthProvider } from './authProviderInstance';
import { notifyAuthSessionChanged } from './authSessionEvents';
import type { AuthSession, BootstrapAuthResult } from './authTypes';
import { isLinkedRemoteAccount } from './authTypes';
import { getTailoAppUserId } from './appUserId';
import { ensureCurrentUserIfNeeded } from './ensureCurrentUser';
import { linkLegacyAnonymousUserIfNeeded } from './legacyAnonymousLink';

export type EnsureAnonymousCloudAccountResult =
  | { status: 'skipped' }
  | { status: 'login_required' }
  | { status: 'no_pet' }
  | { status: 'ready'; session: AuthSession; createdSession: boolean }
  | { status: 'error'; message: string };

export type PrepareAppRemoteAuthResult =
  | { status: 'deferred' }
  | BootstrapAuthResult;

function isRemoteAuthConfigured(): boolean {
  return getAuthProvider().isConfigured();
}

async function bootstrapAuthSessionForAnonymousAccount(): Promise<BootstrapAuthResult> {
  if (!isRemoteAuthConfigured()) {
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

async function readAuthSession(): Promise<AuthSession | null> {
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

/**
 * True when we should restore or create a remote session at app launch
 * (existing session, or user already finished pet setup on this device).
 */
export async function shouldBootstrapRemoteAuthAtStartup(): Promise<boolean> {
  if (!isRemoteAuthConfigured()) {
    return false;
  }

  const session = await getAuthProvider().getSession();

  if (session) {
    return true;
  }

  return hasReadyLocalPetProfile();
}

/**
 * Creates the Supabase anonymous session and Tailo `app_user_id` after the user
 * has a ready local pet profile. Idempotent on return visits.
 */
export async function ensureAnonymousCloudAccountIfNeeded(): Promise<EnsureAnonymousCloudAccountResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  if (await isAuthRequireLogin()) {
    return { status: 'login_required' };
  }

  if (!(await hasReadyLocalPetProfile())) {
    return { status: 'no_pet' };
  }

  let createdSession = false;
  let session = await getAuthProvider().getSession();

  if (!session) {
    const bootstrap = await bootstrapAuthSessionForAnonymousAccount();

    if (bootstrap.status === 'error') {
      return { status: 'error', message: bootstrap.message };
    }

    if (bootstrap.status !== 'ready') {
      return { status: 'skipped' };
    }

    session = bootstrap.session;
    createdSession = bootstrap.createdSession ?? false;
  }

  const ensureResult = await ensureCurrentUserIfNeeded();

  if (ensureResult.status === 'error') {
    return { status: 'error', message: ensureResult.message };
  }

  await linkLegacyAnonymousUserIfNeeded();

  const enrichedSession = (await readAuthSession()) ?? session;

  if (createdSession) {
    logAuth('Anonymous cloud account created after pet profile', {
      userId: enrichedSession.userId,
    });
    notifyAuthSessionChanged();
  }

  return {
    status: 'ready',
    session: enrichedSession,
    createdSession,
  };
}

/** Startup auth: login gate, restore existing session, or defer until pet profile. */
export async function prepareAppRemoteAuth(): Promise<PrepareAppRemoteAuthResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'deferred' };
  }

  if (await isAuthRequireLogin()) {
    return bootstrapAuthSessionForAnonymousAccount();
  }

  const existingSession = await readAuthSession();

  if (existingSession) {
    logAuth('Persisted remote session restored at startup', {
      userId: existingSession.userId,
      isAnonymous: existingSession.isAnonymous,
      isLinked: isLinkedRemoteAccount(existingSession),
    });
    await ensureCurrentUserIfNeeded();
    await linkLegacyAnonymousUserIfNeeded();
    notifyAuthSessionChanged();
    return {
      status: 'ready',
      session: existingSession,
      createdSession: false,
    };
  }

  if (!(await hasReadyLocalPetProfile())) {
    logAuth('Deferred anonymous cloud account until first pet profile is saved', {
      hasPersistedAuthBlob: await hasPersistedSupabaseAuthBlob(),
    });
    return { status: 'deferred' };
  }

  const authResult = await bootstrapAuthSessionForAnonymousAccount();

  if (authResult.status === 'ready') {
    await ensureCurrentUserIfNeeded();
    await linkLegacyAnonymousUserIfNeeded();
    notifyAuthSessionChanged();
  }

  return authResult;
}
