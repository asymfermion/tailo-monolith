import {
  isAppleIdentityAlreadyLinkedError,
  isGoogleIdentityAlreadyLinkedError,
  resolveAppleAuthModeForAccountUpgrade,
  resolveGoogleAuthModeForAccountUpgrade,
  runSocialAccountUpgradeAuth,
} from './AnonymousAccountUpgradeForm';
import type { SocialSignInResult } from '@/modules/auth';

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

describe('resolveAppleAuthModeForAccountUpgrade', () => {
  it('uses link mode for explicit link flow', () => {
    expect(
      resolveAppleAuthModeForAccountUpgrade({
        formMode: 'link',
        session: null,
      }),
    ).toBe('link');
  });

  it('uses link mode for anonymous create flow', () => {
    expect(
      resolveAppleAuthModeForAccountUpgrade({
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

  it('uses sign-in mode for create flow without an anonymous session', () => {
    expect(
      resolveAppleAuthModeForAccountUpgrade({
        formMode: 'create',
        session: {
          userId: 'user-1',
          isAnonymous: false,
          email: 'apple@example.com',
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
    expect(
      isGoogleIdentityAlreadyLinkedError('Google sign-in timed out.'),
    ).toBe(false);
  });
});

describe('isAppleIdentityAlreadyLinkedError', () => {
  it('returns true for provider-linked conflict messages', () => {
    expect(
      isAppleIdentityAlreadyLinkedError(
        'Identity is already linked to another user.',
      ),
    ).toBe(true);
  });
});

describe('runSocialAccountUpgradeAuth', () => {
  const linkedSession = {
    userId: 'apple-user-1',
    isAnonymous: false,
    email: 'apple@example.com',
    emailConfirmed: true,
  };

  it('signs in to an existing Apple account, clears anonymous data, and bootstraps when link conflicts', async () => {
    const signIn = jest
      .fn<
        Promise<SocialSignInResult>,
        [{ mode?: 'sign_in' | 'link'; source?: string }]
      >()
      .mockResolvedValueOnce({
        status: 'error',
        message: 'Identity is already linked to another user.',
      })
      .mockResolvedValueOnce({
        status: 'signed_in',
        session: linkedSession,
      });
    const clearLocalAnonymousData = jest.fn().mockResolvedValue(undefined);
    const completeAccountConnection = jest
      .fn()
      .mockResolvedValue({ status: 'completed' });

    await expect(
      runSocialAccountUpgradeAuth({
        provider: 'apple',
        formMode: 'create',
        session: {
          userId: 'anon-1',
          isAnonymous: true,
          email: null,
          emailConfirmed: false,
        },
        signIn,
        clearLocalAnonymousData,
        completeAccountConnection,
        isIdentityAlreadyLinkedError: isAppleIdentityAlreadyLinkedError,
      }),
    ).resolves.toEqual({
      status: 'signed_in',
      session: linkedSession,
    });

    expect(signIn).toHaveBeenNthCalledWith(1, {
      mode: 'link',
      source: 'account_create_apple',
    });
    expect(signIn).toHaveBeenNthCalledWith(2, {
      mode: 'sign_in',
      source: 'account_create_apple_existing',
    });
    expect(clearLocalAnonymousData).toHaveBeenCalledTimes(1);
    expect(completeAccountConnection).toHaveBeenCalledTimes(1);
  });

  it('returns bootstrap partial errors after Apple conflict fallback sign-in', async () => {
    const signIn = jest
      .fn<
        Promise<SocialSignInResult>,
        [{ mode?: 'sign_in' | 'link'; source?: string }]
      >()
      .mockResolvedValueOnce({
        status: 'error',
        message: 'Identity is already linked to another user.',
      })
      .mockResolvedValueOnce({
        status: 'signed_in',
        session: linkedSession,
      });

    await expect(
      runSocialAccountUpgradeAuth({
        provider: 'apple',
        formMode: 'create',
        session: {
          userId: 'anon-1',
          isAnonymous: true,
          email: null,
          emailConfirmed: false,
        },
        signIn,
        clearLocalAnonymousData: jest.fn().mockResolvedValue(undefined),
        completeAccountConnection: jest.fn().mockResolvedValue({
          status: 'partial',
          message: 'Remote restore failed.',
        }),
        isIdentityAlreadyLinkedError: isAppleIdentityAlreadyLinkedError,
      }),
    ).resolves.toEqual({
      status: 'error',
      message: 'Remote restore failed.',
    });
  });
});
