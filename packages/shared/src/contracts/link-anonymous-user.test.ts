import { describe, expect, it } from 'vitest';

import {
  isLinkAnonymousUserResponse,
  parseLinkAnonymousUserRequest,
} from './link-anonymous-user';

describe('parseLinkAnonymousUserRequest', () => {
  it('parses a valid body', () => {
    expect(
      parseLinkAnonymousUserRequest({ anonymous_user_id: 'anon_abc' }),
    ).toEqual({ anonymous_user_id: 'anon_abc' });
  });

  it('rejects invalid bodies', () => {
    expect(parseLinkAnonymousUserRequest(null)).toBeNull();
    expect(parseLinkAnonymousUserRequest({})).toBeNull();
    expect(parseLinkAnonymousUserRequest({ anonymous_user_id: '' })).toBeNull();
  });
});

describe('isLinkAnonymousUserResponse', () => {
  it('accepts valid responses', () => {
    expect(
      isLinkAnonymousUserResponse({
        user_id: 'uuid',
        created: true,
      }),
    ).toBe(true);
  });

  it('rejects invalid responses', () => {
    expect(isLinkAnonymousUserResponse({ user_id: 'x' })).toBe(false);
  });
});
