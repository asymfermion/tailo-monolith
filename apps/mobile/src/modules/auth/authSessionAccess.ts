import { getTailoAppUserId } from '@/modules/auth/appUserId';
import { getAuthProvider } from '@/modules/auth/authProviderInstance';
import { isAuthRequireLogin } from '@/modules/auth/authRequireLogin';
import type { AuthSession } from '@/modules/auth/authTypes';

export function isRemoteAuthConfigured(): boolean {
  return getAuthProvider().isConfigured();
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
