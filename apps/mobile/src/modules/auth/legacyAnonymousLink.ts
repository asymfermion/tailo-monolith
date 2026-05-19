import { appEnv } from '@/lib/env';
import {
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import {
  getLegacyAnonymousUserId,
  LEGACY_ANON_LINKED_KEY,
} from '@/modules/auth/identity';
import { secureStorage } from '@/modules/auth/secureStorage';
import {
  isLinkAnonymousUserResponse,
  type LinkAnonymousUserResponse,
} from '@tailo/shared';

export type LinkLegacyAnonymousUserResult =
  | { status: 'skipped' }
  | { status: 'no_legacy_id' }
  | { status: 'already_linked' }
  | { status: 'linked'; response: LinkAnonymousUserResponse }
  | { status: 'error'; message: string };

/**
 * One-time Phase 1 → Phase 2 bridge: map SecureStore `anon_*` to Supabase `user_id`.
 * Safe to call every launch; no-ops when not applicable.
 */
export async function linkLegacyAnonymousUserIfNeeded(): Promise<LinkLegacyAnonymousUserResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session) {
    return { status: 'skipped' };
  }

  const alreadyLinked = await secureStorage.getItemAsync(
    LEGACY_ANON_LINKED_KEY,
  );

  if (alreadyLinked === '1') {
    return { status: 'already_linked' };
  }

  const legacyId = await getLegacyAnonymousUserId();

  if (!legacyId) {
    return { status: 'no_legacy_id' };
  }

  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return { status: 'error', message: 'Missing auth session token.' };
  }

  try {
    const response = await fetch(
      `${appEnv.supabaseUrl}/functions/v1/link-anonymous-user`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          apikey: appEnv.supabaseAnonKey,
        },
        body: JSON.stringify({ anonymous_user_id: legacyId }),
      },
    );

    const payload: unknown = await response.json().catch(() => null);

    if (response.status === 409) {
      return {
        status: 'error',
        message:
          typeof payload === 'object' &&
          payload &&
          typeof Reflect.get(payload, 'error') === 'string'
            ? String(Reflect.get(payload, 'error'))
            : 'This device identity is already linked to another account.',
      };
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload &&
        typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Link failed (${response.status}).`;

      return { status: 'error', message };
    }

    if (!isLinkAnonymousUserResponse(payload)) {
      return { status: 'error', message: 'Invalid link response from server.' };
    }

    await secureStorage.setItemAsync(LEGACY_ANON_LINKED_KEY, '1');

    return { status: 'linked', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Could not link legacy identity.',
    };
  }
}
