import { describe, expect, it } from '@jest/globals';

import { isLinkedRemoteAccount, type AuthSession } from './authTypes';

const linkedSession: AuthSession = {
  userId: 'user-1',
  isAnonymous: false,
  email: 'user@example.com',
  emailConfirmed: true,
};

describe('isLinkedRemoteAccount', () => {
  it('returns true when email is confirmed and user is not anonymous', () => {
    expect(isLinkedRemoteAccount(linkedSession)).toBe(true);
  });

  it('returns false for anonymous sessions', () => {
    expect(
      isLinkedRemoteAccount({
        ...linkedSession,
        isAnonymous: true,
      }),
    ).toBe(false);
  });

  it('returns false when email is not confirmed', () => {
    expect(
      isLinkedRemoteAccount({
        ...linkedSession,
        emailConfirmed: false,
      }),
    ).toBe(false);
  });
});
