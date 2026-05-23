export type EnsureCurrentUserInput = {
  supabaseUserId: string;
  email: string | null;
  emailConfirmed: boolean;
};

export type EnsureCurrentUserRpcRow = {
  app_user_id: string;
  created_app_user: boolean;
  created_supabase_identity: boolean;
  created_email_identity: boolean;
};

export type EnsureCurrentUserResult = {
  appUserId: string;
  supabaseUserId: string;
  createdAppUser: boolean;
  createdSupabaseIdentity: boolean;
  createdEmailIdentity: boolean;
};

export function normalizeIdentityEmail(
  email: string | null | undefined,
): string | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();

  return normalized.length > 0 ? normalized : null;
}

export function shouldEnsureEmailIdentity(
  email: string | null,
  emailConfirmed: boolean,
): boolean {
  return emailConfirmed && normalizeIdentityEmail(email) !== null;
}

export function buildEnsureAppUserRpcParams(input: EnsureCurrentUserInput) {
  return {
    p_supabase_user_id: input.supabaseUserId,
    p_email: normalizeIdentityEmail(input.email),
    p_email_confirmed: shouldEnsureEmailIdentity(
      input.email,
      input.emailConfirmed,
    ),
  };
}

export function mapEnsureCurrentUserRow(
  supabaseUserId: string,
  row: EnsureCurrentUserRpcRow,
): EnsureCurrentUserResult {
  return {
    appUserId: row.app_user_id,
    supabaseUserId,
    createdAppUser: row.created_app_user,
    createdSupabaseIdentity: row.created_supabase_identity,
    createdEmailIdentity: row.created_email_identity,
  };
}
