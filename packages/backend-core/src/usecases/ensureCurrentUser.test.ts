import { describe, expect, it } from 'vitest';

import {
  buildEnsureAppUserRpcParams,
  mapEnsureCurrentUserRow,
  normalizeIdentityEmail,
  shouldEnsureEmailIdentity,
} from './ensureCurrentUser';

describe('normalizeIdentityEmail', () => {
  it('lowercases and trims email', () => {
    expect(normalizeIdentityEmail('  User@Example.com ')).toBe(
      'user@example.com',
    );
  });

  it('returns null for empty values', () => {
    expect(normalizeIdentityEmail(null)).toBeNull();
    expect(normalizeIdentityEmail('   ')).toBeNull();
  });
});

describe('shouldEnsureEmailIdentity', () => {
  it('requires confirmed email', () => {
    expect(shouldEnsureEmailIdentity('user@example.com', false)).toBe(false);
    expect(shouldEnsureEmailIdentity('user@example.com', true)).toBe(true);
  });
});

describe('buildEnsureAppUserRpcParams', () => {
  it('maps auth session fields to RPC params', () => {
    expect(
      buildEnsureAppUserRpcParams({
        supabaseUserId: 'auth-user-1',
        email: 'User@Example.com',
        emailConfirmed: true,
      }),
    ).toEqual({
      p_supabase_user_id: 'auth-user-1',
      p_email: 'user@example.com',
      p_email_confirmed: true,
    });
  });
});

describe('mapEnsureCurrentUserRow', () => {
  it('maps RPC row to result', () => {
    expect(
      mapEnsureCurrentUserRow('auth-user-1', {
        app_user_id: 'app-user-1',
        created_app_user: true,
        created_supabase_identity: true,
        created_email_identity: false,
      }),
    ).toEqual({
      appUserId: 'app-user-1',
      supabaseUserId: 'auth-user-1',
      createdAppUser: true,
      createdSupabaseIdentity: true,
      createdEmailIdentity: false,
    });
  });
});
