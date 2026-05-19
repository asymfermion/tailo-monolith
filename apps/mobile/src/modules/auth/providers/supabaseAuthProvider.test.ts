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
      provider.verifyEmailLink('user@example.com', '123456'),
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
      token: '123456',
      type: 'email_change',
    });
  });
});
