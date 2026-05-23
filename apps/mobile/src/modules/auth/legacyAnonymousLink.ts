import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import {
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

  try {
    const result = await invokeTailoApi('link-anonymous-user', {
      anonymous_user_id: legacyId,
    });

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (status === 409) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          'This device identity is already linked to another account.',
        ),
      };
    }

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(payload, `Link failed (${status}).`),
      };
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
