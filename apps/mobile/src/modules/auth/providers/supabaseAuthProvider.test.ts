import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { saveLocalAccountProfile } from '../localAccountProfile';
import {
  createSupabaseAuthProvider,
  resolveOAuthRedirectUri,
} from './supabaseAuthProvider';
import { ExecutionEnvironment } from 'expo-constants';

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}));

jest.mock('../appleNativeAuth', () => {
  const actual = jest.requireActual('../appleNativeAuth') as typeof import('../appleNativeAuth');

  return {
    requestAppleNativeCredential: jest.fn(),
    resolveAppleDisplayName: actual.resolveAppleDisplayName,
  };
});

jest.mock('../localAccountProfile', () => ({
  loadLocalAccountProfile: jest.fn().mockResolvedValue(null),
  saveLocalAccountProfile: jest.fn().mockResolvedValue({
    displayName: 'Apple User',
    updatedAt: '2026-06-10T00:00:00.000Z',
  }),
}));

const mockRequestAppleNativeCredential = jest.mocked(
  (
    jest.requireMock('../appleNativeAuth') as {
      requestAppleNativeCredential: jest.Mock;
    }
  ).requestAppleNativeCredential,
);

describe('createSupabaseAuthProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequestAppleNativeCredential.mockResolvedValue({
      status: 'credential',
      credential: {
        identityToken: 'apple-id-token',
        email: 'apple@example.com',
        displayName: 'Apple User',
        givenName: 'Apple',
        familyName: 'User',
      },
    });
  });

  it('skips bootstrap when env is not configured', async () => {
    jest.mocked(isSupabaseConfigured).mockReturnValue(false);
    const provider = createSupabaseAuthProvider();

    await expect(provider.bootstrapSession()).resolves.toEqual({
      status: 'skipped',
    });
  });

  it('signs in anonymously when there is no session', async () => {
    const signInAnonymously = jest.fn().mockResolvedValue({
      data: {
        session: { user: { id: 'user-new', is_anonymous: true } },
        user: { id: 'user-new', is_anonymous: true },
      },
      error: null,
    });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        signInAnonymously,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(provider.bootstrapSession()).resolves.toEqual({
      status: 'ready',
      session: {
        userId: 'user-new',
        isAnonymous: true,
        email: null,
        emailConfirmed: false,
      },
      createdSession: true,
    });
  });

  it('creates an anonymous session before sending a verification email', async () => {
    const signInAnonymously = jest.fn().mockResolvedValue({
      data: {
        session: { user: { id: 'user-new', is_anonymous: true } },
        user: { id: 'user-new', is_anonymous: true },
      },
      error: null,
    });
    const updateUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-new', is_anonymous: true } },
      error: null,
    });
    const getSession = jest
      .fn()
      .mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session: { user: { id: 'user-new', is_anonymous: true } },
        },
        error: null,
      });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        signInAnonymously,
        updateUser,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.requestEmailLink('user@example.com'),
    ).resolves.toEqual({ status: 'code_sent' });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('sends a verification email for anonymous users', async () => {
    const updateUser = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: { user: { id: 'user-1', is_anonymous: true } },
          },
        }),
        updateUser,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.requestEmailLink('user@example.com'),
    ).resolves.toEqual({ status: 'code_sent' });
    expect(updateUser).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('verifies email OTP and returns the updated session', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          is_anonymous: false,
          email: 'user@example.com',
          email_confirmed_at: '2026-05-18T00:00:00.000Z',
        },
      },
      error: null,
    });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { verifyOtp },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.verifyEmailLink('user@example.com', '12345678'),
    ).resolves.toEqual({
      status: 'verified',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '12345678',
      type: 'email_change',
    });
  });

  it('registers a new account with email OTP', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: null });
    const verifyOtp = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-new',
          is_anonymous: false,
          email: 'new@example.com',
          email_confirmed_at: '2026-05-18T00:00:00.000Z',
        },
      },
      error: null,
    });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        signInWithOtp,
        verifyOtp,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.requestEmailSignUp('new@example.com'),
    ).resolves.toEqual({ status: 'code_sent' });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'new@example.com',
      options: { shouldCreateUser: true },
    });

    await expect(
      provider.verifyEmailSignUp('new@example.com', '12345678'),
    ).resolves.toEqual({
      status: 'verified',
      session: {
        userId: 'user-new',
        isAnonymous: false,
        email: 'new@example.com',
        emailConfirmed: true,
      },
    });
  });

  it('sends a sign-in OTP for returning users', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { signInWithOtp },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.requestSignInOtp('user@example.com'),
    ).resolves.toEqual({ status: 'code_sent' });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: { shouldCreateUser: false },
    });
  });

  it('sets a password on the current account', async () => {
    const updateUser = jest.fn().mockResolvedValue({ error: null });
    const getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            is_anonymous: false,
            email: 'user@example.com',
            email_confirmed_at: '2026-05-18T00:00:00.000Z',
          },
        },
      },
    });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { updateUser, getSession },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(provider.setPassword('Hunter22!')).resolves.toEqual({
      status: 'updated',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(updateUser).toHaveBeenCalledWith({ password: 'Hunter22!' });
  });

  it('rejects weak passwords before calling Supabase', async () => {
    const updateUser = jest.fn();

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { updateUser },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(provider.setPassword('hunter22')).resolves.toEqual({
      status: 'error',
      message:
        'Use at least 8 characters with uppercase, lowercase, a number, and a special character.',
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('verifies sign-in OTP and returns a linked session', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          is_anonymous: false,
          email: 'user@example.com',
          email_confirmed_at: '2026-05-18T00:00:00.000Z',
        },
      },
      error: null,
    });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { verifyOtp },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.verifySignInOtp('user@example.com', '12345678'),
    ).resolves.toEqual({
      status: 'signed_in',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '12345678',
      type: 'email',
    });
  });

  it('requests a password reset code by email', async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { resetPasswordForEmail },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.requestPasswordReset('user@example.com'),
    ).resolves.toEqual({ status: 'code_sent' });
    expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('verifies a password reset code', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { verifyOtp },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.verifyPasswordResetOtp('user@example.com', '12345678'),
    ).resolves.toEqual({ status: 'verified' });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '12345678',
      type: 'recovery',
    });
  });

  it('signs in with email and password', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          is_anonymous: false,
          email: 'user@example.com',
          email_confirmed_at: '2026-05-18T00:00:00.000Z',
        },
      },
      error: null,
    });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { signInWithPassword },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.signInWithPassword('user@example.com', 'hunter22'),
    ).resolves.toEqual({
      status: 'signed_in',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hunter22',
    });
  });

  it('signs out the current session', async () => {
    const signOut = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: { signOut },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(provider.signOut()).resolves.toEqual({ status: 'signed_out' });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('clears anonymous session before google sign-in', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'anon-1', is_anonymous: true } } },
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const signInWithOAuth = jest
      .fn()
      .mockResolvedValue({ data: { url: null }, error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        signOut,
        signInWithOAuth,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.signInWithGoogle({ mode: 'sign_in' }),
    ).resolves.toEqual({
      status: 'error',
      message: 'Google sign-in did not start.',
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'tailo://auth/callback',
        skipBrowserRedirect: true,
      },
    });
  });

  it('does not sign out linked session before google sign-in', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1', is_anonymous: false } } },
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const signInWithOAuth = jest
      .fn()
      .mockResolvedValue({ data: { url: null }, error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        signOut,
        signInWithOAuth,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.signInWithGoogle({ mode: 'sign_in' }),
    ).resolves.toEqual({
      status: 'error',
      message: 'Google sign-in did not start.',
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
  });

  it('uses Expo linking URI for OAuth redirects in Expo Go', () => {
    expect(
      resolveOAuthRedirectUri({
        executionEnvironment: ExecutionEnvironment.StoreClient,
        linkingUri: 'exp://127.0.0.1:8081/--/',
        scheme: 'tailo',
      }),
    ).toBe('exp://127.0.0.1:8081/--/auth/callback');
  });

  it('uses app scheme for OAuth redirects in native builds', () => {
    expect(
      resolveOAuthRedirectUri({
        executionEnvironment: ExecutionEnvironment.Standalone,
        linkingUri: 'exp://127.0.0.1:8081/--/',
        scheme: 'tailo',
      }),
    ).toBe('tailo://auth/callback');
  });

  it('signs in with Apple id token', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: null },
    });
    const signInWithIdToken = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'apple-user-1',
          is_anonymous: false,
          email: 'apple@example.com',
          email_confirmed_at: '2026-06-06T00:00:00.000Z',
        },
      },
      error: null,
    });
    const updateUser = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        signInWithIdToken,
        updateUser,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.signInWithApple({ mode: 'sign_in' }),
    ).resolves.toEqual({
      status: 'signed_in',
      session: {
        userId: 'apple-user-1',
        isAnonymous: false,
        email: 'apple@example.com',
        emailConfirmed: true,
      },
    });
    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-id-token',
    });
    expect(updateUser).toHaveBeenCalledWith({
      data: {
        full_name: 'Apple User',
        name: 'Apple User',
        given_name: 'Apple',
        family_name: 'User',
      },
    });
    expect(saveLocalAccountProfile).toHaveBeenCalledWith({
      displayName: 'Apple User',
    });
  });

  it('clears anonymous session before Apple sign-in', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'anon-1', is_anonymous: true } } },
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });
    const signInWithIdToken = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'apple-user-1',
          is_anonymous: false,
          email: 'apple@example.com',
          email_confirmed_at: '2026-06-06T00:00:00.000Z',
        },
      },
      error: null,
    });
    const updateUser = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        signOut,
        signInWithIdToken,
        updateUser,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.signInWithApple({ mode: 'sign_in' }),
    ).resolves.toEqual({
      status: 'signed_in',
      session: {
        userId: 'apple-user-1',
        isAnonymous: false,
        email: 'apple@example.com',
        emailConfirmed: true,
      },
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signInWithIdToken).toHaveBeenCalledTimes(1);
  });

  it('rejects direct Apple sign-in when Supabase returns an anonymous user', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: null },
    });
    const signInWithIdToken = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'anon-1',
          is_anonymous: true,
          email: null,
          email_confirmed_at: null,
        },
      },
      error: null,
    });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        signInWithIdToken,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(
      provider.signInWithApple({ mode: 'sign_in' }),
    ).resolves.toEqual({
      status: 'error',
      message: 'This Apple account is not linked to a saved account yet.',
    });
  });

  it('links Apple id token to an anonymous session', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'anon-1', is_anonymous: true } } },
    });
    const linkIdentity = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'anon-1',
          is_anonymous: false,
          email: 'apple@example.com',
          email_confirmed_at: '2026-06-06T00:00:00.000Z',
        },
      },
      error: null,
    });
    const updateUser = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        linkIdentity,
        updateUser,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(provider.signInWithApple({ mode: 'link' })).resolves.toEqual({
      status: 'signed_in',
      session: {
        userId: 'anon-1',
        isAnonymous: false,
        email: 'apple@example.com',
        emailConfirmed: true,
      },
    });
    expect(linkIdentity).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-id-token',
    });
    expect(updateUser).toHaveBeenCalledWith({
      data: {
        full_name: 'Apple User',
        name: 'Apple User',
        given_name: 'Apple',
        family_name: 'User',
      },
    });
    expect(saveLocalAccountProfile).toHaveBeenCalledWith({
      displayName: 'Apple User',
    });
  });

  it('rejects Apple link mode unless the current Supabase session is anonymous', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1', is_anonymous: false } } },
    });
    const linkIdentity = jest.fn();

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        linkIdentity,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await expect(provider.signInWithApple({ mode: 'link' })).resolves.toEqual({
      status: 'error',
      message: 'Apple can only be linked from an anonymous session.',
    });
    expect(linkIdentity).not.toHaveBeenCalled();
  });

  it('uses first Apple credential display name as profile fallback', async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: null },
    });
    const signInWithIdToken = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'apple-user-1',
          is_anonymous: false,
          email: 'apple@example.com',
          email_confirmed_at: '2026-06-06T00:00:00.000Z',
        },
      },
      error: null,
    });
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { user_metadata: {} } },
    });
    const updateUser = jest.fn().mockResolvedValue({ error: null });

    jest.mocked(isSupabaseConfigured).mockReturnValue(true);
    jest.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getSession,
        signInWithIdToken,
        getUser,
        updateUser,
      },
    } as never);

    const provider = createSupabaseAuthProvider();

    await provider.signInWithApple({ mode: 'sign_in' });

    await expect(provider.getIdentityDisplayName?.()).resolves.toBe(
      'Apple User',
    );
    expect(updateUser).toHaveBeenCalledWith({
      data: {
        full_name: 'Apple User',
        name: 'Apple User',
        given_name: 'Apple',
        family_name: 'User',
      },
    });
    expect(saveLocalAccountProfile).toHaveBeenCalledWith({
      displayName: 'Apple User',
    });
  });
});
