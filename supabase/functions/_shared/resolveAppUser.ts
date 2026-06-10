import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { buildEnsureAppUserRpcParams } from '../../../packages/backend-core/src/usecases/ensureCurrentUser.ts';

type EnsureRpcRow = {
  app_user_id: string;
};

export async function resolveCallerAppUserId(
  user: User,
  adminClient: SupabaseClient,
): Promise<{ appUserId: string } | { error: string }> {
  const { data, error } = await adminClient.rpc(
    'ensure_app_user_for_auth',
    buildEnsureAppUserRpcParams({
      supabaseUserId: user.id,
      email: user.email ?? null,
      emailConfirmed: Boolean(user.email_confirmed_at),
    }),
  );

  if (error) {
    return { error: error.message };
  }

  const row = (Array.isArray(data) ? data[0] : data) as EnsureRpcRow | null;

  if (!row?.app_user_id) {
    return { error: 'Could not resolve app user.' };
  }

  return { appUserId: row.app_user_id };
}

type UserIdentityRow = {
  app_user_id: string;
};

/** Read-only lookup — does not create missing app users. */
export async function lookupCallerAppUserId(
  user: User,
  adminClient: SupabaseClient,
): Promise<{ appUserId: string } | null> {
  const { data, error } = await adminClient
    .from('user_identities')
    .select('app_user_id')
    .eq('provider', 'supabase_auth')
    .eq('provider_subject', user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as UserIdentityRow;

  return row.app_user_id ? { appUserId: row.app_user_id } : null;
}
