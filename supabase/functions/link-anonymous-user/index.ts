import { createClient } from '@supabase/supabase-js';
import { resolveLinkAnonymousUser } from '../../../packages/backend-core/src/usecases/linkAnonymousUser.ts';
import { parseLinkAnonymousUserRequest } from '../../../packages/shared/src/contracts/link-anonymous-user.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = parseLinkAnonymousUserRequest(await request.json().catch(() => null));

    if (!body) {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
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
      return jsonResponse({ error: decision.message, code: decision.code }, status);
    }

    if (decision.created) {
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({ user_id: user.id }, { onConflict: 'user_id' });

      if (profileError) {
        return jsonResponse({ error: profileError.message }, 500);
      }

      const { error: insertError } = await adminClient
        .from('anonymous_id_links')
        .insert({
          anonymous_user_id: body.anonymous_user_id,
          user_id: user.id,
        });

      if (insertError) {
        return jsonResponse({ error: insertError.message }, 500);
      }
    }

    return jsonResponse({
      user_id: decision.userId,
      created: decision.created,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
