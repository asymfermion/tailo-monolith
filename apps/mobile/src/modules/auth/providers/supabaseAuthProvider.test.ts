import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { createSupabaseAuthProvider } from './supabaseAuthProvider';

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabaseClient: jest.fn(),
}));

describe('createSupabaseAuthProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
});
