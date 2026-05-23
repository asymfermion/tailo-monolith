import {
  buildEnsureAppUserRpcParams,
  mapEnsureCurrentUserRow,
} from '../../../../packages/backend-core/src/usecases/ensureCurrentUser.ts';
import { isEnsureCurrentUserResponse } from '../../../../packages/shared/src/contracts/ensure-current-user.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import type { ApiHandler } from './types.ts';

export const handleEnsureCurrentUser: ApiHandler = async ({ user, log }) => {
  const adminClient = getServiceRoleClient();
  const rpcParams = buildEnsureAppUserRpcParams({
    supabaseUserId: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
  });

  const { data: rows, error: ensureError } = await adminClient.rpc(
    'ensure_app_user_for_auth',
    rpcParams,
  );

  if (ensureError) {
    return jsonResponse({ error: ensureError.message }, 500);
  }

  const row = Array.isArray(rows) ? rows[0] : rows;

  if (!row || typeof row.app_user_id !== 'string') {
    return jsonResponse({ error: 'Could not resolve app user.' }, 500);
  }

  const mapped = mapEnsureCurrentUserRow(user.id, row);

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' });

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }

  log.info('ensure_current_user', {
    userId: user.id,
    appUserId: mapped.appUserId,
    createdAppUser: mapped.createdAppUser,
  });

  const responseBody = {
    app_user_id: mapped.appUserId,
    user_id: mapped.supabaseUserId,
    created_app_user: mapped.createdAppUser,
    created_supabase_identity: mapped.createdSupabaseIdentity,
    created_email_identity: mapped.createdEmailIdentity,
  };

  if (!isEnsureCurrentUserResponse(responseBody)) {
    return jsonResponse({ error: 'Invalid ensure response.' }, 500);
  }

  return jsonResponse(responseBody);
};
