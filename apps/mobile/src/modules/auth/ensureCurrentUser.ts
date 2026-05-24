import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { secureStorage } from '@/modules/auth/secureStorage';
import {
  isEnsureCurrentUserResponse,
  type EnsureCurrentUserResponse,
} from '@tailo/shared';

export const APP_USER_ID_KEY = 'tailo.app_user_id';

export type EnsureCurrentUserIfNeededResult =
  | { status: 'skipped' }
  | { status: 'no_session' }
  | { status: 'ensured'; response: EnsureCurrentUserResponse }
  | { status: 'error'; message: string };

let memoryAppUserId: string | null = null;

export async function getTailoAppUserId(): Promise<string | null> {
  if (memoryAppUserId) {
    return memoryAppUserId;
  }

  const stored = await secureStorage.getItemAsync(APP_USER_ID_KEY);
  memoryAppUserId = stored;
  return stored;
}

export async function clearTailoAppUserIdCache(): Promise<void> {
  memoryAppUserId = null;
  await secureStorage.deleteItemAsync(APP_USER_ID_KEY);
}

async function persistTailoAppUserId(appUserId: string): Promise<void> {
  memoryAppUserId = appUserId;
  await secureStorage.setItemAsync(APP_USER_ID_KEY, appUserId);
}

/**
 * Maps the current Supabase session to a stable Tailo `app_user_id`.
 * Idempotent — safe to call on every launch and after sign-in.
 */
export async function ensureCurrentUserIfNeeded(): Promise<EnsureCurrentUserIfNeededResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session) {
    return { status: 'no_session' };
  }

  try {
    const result = await invokeTailoApi('ensure-current-user');

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          `Ensure user failed (${status}).`,
        ),
      };
    }

    if (!isEnsureCurrentUserResponse(payload)) {
      return {
        status: 'error',
        message: 'Invalid ensure response from server.',
      };
    }

    await persistTailoAppUserId(payload.app_user_id);

    return { status: 'ensured', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Could not resolve Tailo app user.',
    };
  }
}
