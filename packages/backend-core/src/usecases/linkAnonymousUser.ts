export type AnonymousIdLinkRow = {
  anonymousUserId: string;
  userId: string;
};

export type LinkAnonymousUserInput = {
  callerUserId: string;
  legacyAnonymousUserId: string;
};

export type LinkAnonymousUserSuccess = {
  ok: true;
  userId: string;
  created: boolean;
};

export type LinkAnonymousUserFailure = {
  ok: false;
  code: 'invalid_legacy_id' | 'conflict';
  message: string;
};

export type LinkAnonymousUserResult =
  LinkAnonymousUserSuccess | LinkAnonymousUserFailure;

const LEGACY_ANON_PREFIX = 'anon_';

/** Pure idempotency / conflict rules for legacy Phase 1 → Supabase user mapping. */
export function resolveLinkAnonymousUser(
  input: LinkAnonymousUserInput,
  existing: AnonymousIdLinkRow | null,
): LinkAnonymousUserResult {
  const legacyId = input.legacyAnonymousUserId.trim();

  if (!legacyId.startsWith(LEGACY_ANON_PREFIX)) {
    return {
      ok: false,
      code: 'invalid_legacy_id',
      message: 'Legacy anonymous user id must start with anon_.',
    };
  }

  if (!existing) {
    return {
      ok: true,
      userId: input.callerUserId,
      created: true,
    };
  }

  if (existing.userId === input.callerUserId) {
    return {
      ok: true,
      userId: input.callerUserId,
      created: false,
    };
  }

  return {
    ok: false,
    code: 'conflict',
    message: 'This device identity is already linked to another account.',
  };
}
