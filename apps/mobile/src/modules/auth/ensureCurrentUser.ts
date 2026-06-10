import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import { persistTailoAppUserId } from '@/modules/auth/appUserId';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authSessionAccess';
import {
  isEnsureCurrentUserResponse,
  type EnsureCurrentUserResponse,
} from '@tailo/shared';

export type EnsureCurrentUserIfNeededResult =
  | { status: 'skipped' }
  | { status: 'no_session' }
  | { status: 'ensured'; response: EnsureCurrentUserResponse }
  | { status: 'error'; message: string };

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
