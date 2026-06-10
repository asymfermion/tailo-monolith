import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import { isDeleteAccountResponse } from '@tailo/shared';

import { logAuth } from './authLogger';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from './authSessionAccess';

export type DeleteRemoteAccountResult =
  | { status: 'skipped' }
  | { status: 'deleted'; appUserId: string | null }
  | { status: 'error'; message: string };

/** Deletes the signed-in Tailo cloud account and Supabase auth user. */
export async function deleteRemoteAccountIfPossible(): Promise<DeleteRemoteAccountResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session) {
    logAuth('Remote account delete skipped (no active session)');
    return { status: 'skipped' };
  }

  logAuth('Remote account delete started', { userId: session.userId });

  const result = await invokeTailoApi('delete-account');

  if ('error' in result) {
    return { status: 'error', message: result.error };
  }

  const { ok, status, payload } = result;

  if (!ok) {
    return {
      status: 'error',
      message: readApiErrorMessage(
        payload,
        `Delete account failed (${status}).`,
      ),
    };
  }

  if (!isDeleteAccountResponse(payload)) {
    return {
      status: 'error',
      message: 'Invalid delete-account response from server.',
    };
  }

  logAuth('Remote account delete finished', {
    appUserId: payload.app_user_id,
    authUserId: payload.auth_user_id,
  });

  return {
    status: 'deleted',
    appUserId: payload.app_user_id,
  };
}
