import { resolveLinkAnonymousUser } from '../../../packages/backend-core/src/usecases/linkAnonymousUser.ts';
import { parseLinkAnonymousUserRequest } from '../../../packages/shared/src/contracts/link-anonymous-user.ts';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  jsonResponse,
} from '../_shared/http.ts';
import { servePostFunction } from '../_shared/serve.ts';

servePostFunction('link-anonymous-user', async (request, log) => {
  const authResult = await getAuthenticatedUser(request, log);

  if ('error' in authResult) {
    return authResult.error;
  }

  const body = parseLinkAnonymousUserRequest(await request.json().catch(() => null));

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  log.info('link_request', {
    userId: authResult.user.id,
    legacyAnonymousUserId: body.anonymous_user_id,
  });

  const adminClient = getServiceRoleClient();
  const { data: existingRow, error: lookupError } = await adminClient
    .from('anonymous_id_links')
    .select('anonymous_user_id, user_id')
    .eq('anonymous_user_id', body.anonymous_user_id)
    .maybeSingle();

  if (lookupError) {
    return jsonResponse({ error: lookupError.message }, 500);
  }

  const decision = resolveLinkAnonymousUser(
    {
      callerUserId: authResult.user.id,
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
    return jsonResponse({ error: decision.message, code: decision.code }, status);
  }

  if (decision.created) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({ user_id: authResult.user.id }, { onConflict: 'user_id' });

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 500);
    }

    const { error: insertError } = await adminClient
      .from('anonymous_id_links')
      .insert({
        anonymous_user_id: body.anonymous_user_id,
        user_id: authResult.user.id,
      });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    log.info('link_created', { userId: decision.userId });
  } else {
    log.info('link_exists', { userId: decision.userId });
  }

  return jsonResponse({
    user_id: decision.userId,
    created: decision.created,
  });
});
