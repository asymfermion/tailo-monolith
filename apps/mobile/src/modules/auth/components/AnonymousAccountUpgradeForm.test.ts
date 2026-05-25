import {
  isGoogleIdentityAlreadyLinkedError,
  resolveGoogleAuthModeForAccountUpgrade,
} from './AnonymousAccountUpgradeForm';

describe('resolveGoogleAuthModeForAccountUpgrade', () => {
  it('uses link mode for explicit link flow', () => {
    expect(
      resolveGoogleAuthModeForAccountUpgrade({
        formMode: 'link',
        session: null,
      }),
    ).toBe('link');
  });

  it('uses link mode for create flow with anonymous session', () => {
    expect(
      resolveGoogleAuthModeForAccountUpgrade({
        formMode: 'create',
        session: {
          userId: 'anon-1',
          isAnonymous: true,
          email: null,
          emailConfirmed: false,
        },
      }),
    ).toBe('link');
  });

  it('falls back to sign_in mode for create flow without anonymous session', () => {
    expect(
      resolveGoogleAuthModeForAccountUpgrade({
        formMode: 'create',
        session: {
          userId: 'user-1',
          isAnonymous: false,
          email: 'user@example.com',
          emailConfirmed: true,
        },
      }),
    ).toBe('sign_in');
  });
});

describe('isGoogleIdentityAlreadyLinkedError', () => {
  it('returns true for common provider-linked conflict messages', () => {
    expect(
      isGoogleIdentityAlreadyLinkedError(
        'Identity is already linked to another user.',
      ),
    ).toBe(true);
    expect(
      isGoogleIdentityAlreadyLinkedError('This identity is already in use.'),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isGoogleIdentityAlreadyLinkedError('Google sign-in timed out.')).toBe(
      false,
    );
  });
});
