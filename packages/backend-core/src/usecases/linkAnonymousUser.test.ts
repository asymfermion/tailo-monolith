import { describe, expect, it } from 'vitest';

import { resolveLinkAnonymousUser } from './linkAnonymousUser';

describe('resolveLinkAnonymousUser', () => {
  it('creates a mapping when no row exists', () => {
    expect(
      resolveLinkAnonymousUser(
        {
          callerUserId: 'user-a',
          legacyAnonymousUserId: 'anon_abc',
        },
        null,
      ),
    ).toEqual({
      ok: true,
      userId: 'user-a',
      created: true,
    });
  });

  it('is idempotent for the same user', () => {
    expect(
      resolveLinkAnonymousUser(
        {
          callerUserId: 'user-a',
          legacyAnonymousUserId: 'anon_abc',
        },
        { anonymousUserId: 'anon_abc', userId: 'user-a' },
      ),
    ).toEqual({
      ok: true,
      userId: 'user-a',
      created: false,
    });
  });

  it('rejects when legacy id maps to a different user', () => {
    expect(
      resolveLinkAnonymousUser(
        {
          callerUserId: 'user-b',
          legacyAnonymousUserId: 'anon_abc',
        },
        { anonymousUserId: 'anon_abc', userId: 'user-a' },
      ),
    ).toEqual({
      ok: false,
      code: 'conflict',
      message: 'This device identity is already linked to another account.',
    });
  });

  it('rejects invalid legacy ids', () => {
    expect(
      resolveLinkAnonymousUser(
        {
          callerUserId: 'user-a',
          legacyAnonymousUserId: 'not-legacy',
        },
        null,
      ),
    ).toMatchObject({
      ok: false,
      code: 'invalid_legacy_id',
    });
  });
});
