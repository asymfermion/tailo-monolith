import { resolveLinkAnonymousUser } from '../../../../packages/backend-core/src/usecases/linkAnonymousUser.ts';
import { buildEnsureAppUserRpcParams } from '../../../../packages/backend-core/src/usecases/ensureCurrentUser.ts';
import { parseLinkAnonymousUserRequest } from '../../../../packages/shared/src/contracts/link-anonymous-user.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import type { ApiHandler } from './types.ts';

export const handleLinkAnonymousUser: ApiHandler = async ({
  user,
  log,
  payload,
}) => {
  const body = parseLinkAnonymousUserRequest(payload);

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  log.info('link_request', {
    userId: user.id,
    legacyAnonymousUserId: body.anonymous_user_id,
  });

  const adminClient = getServiceRoleClient();
  const ensureParams = buildEnsureAppUserRpcParams({
    supabaseUserId: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
  });

  const { data: ensureRows, error: ensureError } = await adminClient.rpc(
    'ensure_app_user_for_auth',
    ensureParams,
  );

  if (ensureError) {
    return jsonResponse({ error: ensureError.message }, 500);
  }

  const ensureRow = Array.isArray(ensureRows) ? ensureRows[0] : ensureRows;
  const appUserId =
    ensureRow && typeof ensureRow.app_user_id === 'string'
      ? ensureRow.app_user_id
      : null;

  if (!appUserId) {
    return jsonResponse({ error: 'Could not resolve app user.' }, 500);
  }

  const { data: existingRow, error: lookupError } = await adminClient
    .from('anonymous_id_links')
    .select('anonymous_user_id, user_id, app_user_id')
    .eq('anonymous_user_id', body.anonymous_user_id)
    .maybeSingle();

  if (lookupError) {
    return jsonResponse({ error: lookupError.message }, 500);
  }

  const decision = resolveLinkAnonymousUser(
    {
      callerUserId: user.id,
      legacyAnonymousUserId: body.anonymous_user_id,
    },
    existingRow
      ? {
          anonymousUserId: existingRow.anonymous_user_id,
          userId: existingRow.user_id,
        }
      : null,
  );

  if (!decision.ok) {
    const status = decision.code === 'conflict' ? 409 : 400;
    return jsonResponse(
      { error: decision.message, code: decision.code },
      status,
    );
  }

  if (decision.created) {
    const { error: insertError } = await adminClient
      .from('anonymous_id_links')
      .insert({
        anonymous_user_id: body.anonymous_user_id,
        user_id: user.id,
        app_user_id: appUserId,
      });

    if (insertError) {
      // 23505 = unique_violation (PK conflict): a concurrent request created the link — treat as success.
      if (insertError.code !== '23505') {
        return jsonResponse({ error: insertError.message }, 500);
      }
    }

    log.info('link_created', { userId: decision.userId, appUserId });
  } else {
    if (existingRow && !existingRow.app_user_id) {
      const { error: backfillError } = await adminClient
        .from('anonymous_id_links')
        .update({ app_user_id: appUserId })
        .eq('anonymous_user_id', body.anonymous_user_id);

      if (backfillError) {
        return jsonResponse({ error: backfillError.message }, 500);
      }
    }

    log.info('link_exists', { userId: decision.userId, appUserId });
  }

  return jsonResponse({
    user_id: decision.userId,
    app_user_id: appUserId,
    created: decision.created,
  });
};
