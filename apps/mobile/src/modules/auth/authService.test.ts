import type { AuthProvider } from './authProvider';
import {
  bootstrapAuthSession,
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
  logoutRemoteAccount,
  requestSignInOtp,
  requestEmailLink,
  requestPasswordReset,
  resetAuthProvider,
  setAccountPassword,
  setAuthProvider,
  signInWithPassword,
  signOutRemoteSession,
  verifyEmailLink,
  verifyPasswordResetOtp,
  verifySignInOtp,
} from './authService';
import { completeEmailAccountConnection } from './completeEmailAccountConnection';

const mockIsAuthRequireLogin = jest.fn();
const mockSetAuthRequireLogin = jest.fn();
const mockClearAuthRequireLogin = jest.fn();

jest.mock('./authRequireLogin', () => ({
  isAuthRequireLogin: () => mockIsAuthRequireLogin(),
  setAuthRequireLogin: () => mockSetAuthRequireLogin(),
  clearAuthRequireLogin: () => mockClearAuthRequireLogin(),
}));

jest.mock('./completeEmailAccountConnection', () => ({
  completeEmailAccountConnection: jest.fn().mockResolvedValue({
    status: 'completed',
  }),
}));

jest.mock('./completeOnboardingForReturningLinkedUser', () => ({
  completeOnboardingForReturningLinkedUser: jest.fn().mockResolvedValue(false),
}));

const mockNotifyAuthSessionChanged = jest.fn();

jest.mock('./authSessionEvents', () => ({
  notifyAuthSessionChanged: () => mockNotifyAuthSessionChanged(),
}));

function createMockProvider(
  overrides: Partial<AuthProvider> = {},
): AuthProvider {
  return {
    kind: 'mock',
    isConfigured: () => true,
    bootstrapSession: jest.fn().mockResolvedValue({
      status: 'ready',
      session: {
        userId: 'user-1',
        isAnonymous: true,
        email: null,
        emailConfirmed: false,
      },
      createdSession: true,
    }),
    getSession: jest.fn().mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    }),
    getAccessToken: jest.fn().mockResolvedValue('token-abc'),
    requestEmailLink: jest.fn().mockResolvedValue({ status: 'code_sent' }),
    requestEmailSignUp: jest.fn().mockResolvedValue({ status: 'code_sent' }),
    verifyEmailLink: jest.fn().mockResolvedValue({
      status: 'verified',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    }),
    verifyEmailSignUp: jest.fn().mockResolvedValue({
      status: 'verified',
      session: {
        userId: 'user-new',
        isAnonymous: false,
        email: 'new@example.com',
        emailConfirmed: true,
      },
    }),
    setPassword: jest.fn().mockResolvedValue({
      status: 'updated',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    }),
    requestSignInOtp: jest.fn().mockResolvedValue({ status: 'code_sent' }),
    verifySignInOtp: jest.fn().mockResolvedValue({
      status: 'signed_in',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      status: 'signed_in',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    }),
    requestPasswordReset: jest.fn().mockResolvedValue({ status: 'code_sent' }),
    verifyPasswordResetOtp: jest.fn().mockResolvedValue({ status: 'verified' }),
    signOut: jest.fn().mockResolvedValue({ status: 'signed_out' }),
    ...overrides,
  };
}

describe('authService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetAuthProvider();
    mockIsAuthRequireLogin.mockResolvedValue(false);
    mockSetAuthRequireLogin.mockResolvedValue(undefined);
    mockClearAuthRequireLogin.mockResolvedValue(undefined);
    jest.mocked(completeEmailAccountConnection).mockResolvedValue({
      status: 'completed',
    });
  });

  afterEach(() => {
    resetAuthProvider();
  });

  it('delegates bootstrap to the active provider', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(bootstrapAuthSession()).resolves.toEqual({
      status: 'ready',
      session: {
        userId: 'user-1',
        isAnonymous: true,
        email: null,
        emailConfirmed: false,
      },
      createdSession: true,
    });
    expect(provider.bootstrapSession).toHaveBeenCalledTimes(1);
  });

  it('returns logged_out when login is required without bootstrapping', async () => {
    mockIsAuthRequireLogin.mockResolvedValue(true);
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(bootstrapAuthSession()).resolves.toEqual({
      status: 'logged_out',
    });
    expect(provider.signOut).toHaveBeenCalledTimes(1);
    expect(provider.bootstrapSession).not.toHaveBeenCalled();
  });

  it('hides session reads while login is required', async () => {
    mockIsAuthRequireLogin.mockResolvedValue(true);
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(getAuthSession()).resolves.toBeNull();
    await expect(getAuthAccessToken()).resolves.toBeNull();
    expect(provider.getSession).not.toHaveBeenCalled();
  });

  it('reports when remote auth is not configured', () => {
    setAuthProvider(createMockProvider({ isConfigured: () => false }));

    expect(isRemoteAuthConfigured()).toBe(false);
  });

  it('delegates email link requests', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(requestEmailLink('user@example.com')).resolves.toEqual({
      status: 'code_sent',
    });
    expect(provider.requestEmailLink).toHaveBeenCalledWith('user@example.com');
  });

  it('delegates email verification', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(
      verifyEmailLink('user@example.com', '123456'),
    ).resolves.toEqual({
      status: 'verified',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(mockClearAuthRequireLogin).toHaveBeenCalledTimes(1);
    expect(mockNotifyAuthSessionChanged).toHaveBeenCalled();
  });

  it('delegates password setup', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(setAccountPassword('hunter22')).resolves.toEqual({
      status: 'updated',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(provider.setPassword).toHaveBeenCalledWith('hunter22');
  });

  it('delegates sign-in OTP requests', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(requestSignInOtp('user@example.com')).resolves.toEqual({
      status: 'code_sent',
    });
    expect(provider.requestSignInOtp).toHaveBeenCalledWith('user@example.com');
  });

  it('clears login-required mode after OTP sign-in', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(
      verifySignInOtp('user@example.com', '123456'),
    ).resolves.toEqual({
      status: 'signed_in',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(mockClearAuthRequireLogin).toHaveBeenCalledTimes(1);
    expect(completeEmailAccountConnection).toHaveBeenCalledTimes(1);
  });

  it('clears login-required mode after password sign-in', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(
      signInWithPassword('user@example.com', 'hunter22'),
    ).resolves.toEqual({
      status: 'signed_in',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(provider.signInWithPassword).toHaveBeenCalledWith(
      'user@example.com',
      'hunter22',
    );
    expect(mockClearAuthRequireLogin).toHaveBeenCalledTimes(1);
    expect(mockNotifyAuthSessionChanged).toHaveBeenCalled();
  });

  it('returns from sign-in before deferred bootstrap finishes', async () => {
    let resolveBootstrap: (() => void) | undefined;
    const bootstrapGate = new Promise<void>((resolve) => {
      resolveBootstrap = resolve;
    });

    jest.mocked(completeEmailAccountConnection).mockImplementation(async () => {
      await bootstrapGate;
      return { status: 'completed' };
    });

    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(
      signInWithPassword('user@example.com', 'hunter22'),
    ).resolves.toMatchObject({ status: 'signed_in' });

    expect(completeEmailAccountConnection).toHaveBeenCalledTimes(1);
    expect(mockNotifyAuthSessionChanged).toHaveBeenCalled();

    resolveBootstrap?.();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    expect(
      mockNotifyAuthSessionChanged.mock.calls.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('delegates sign out', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(signOutRemoteSession()).resolves.toEqual({
      status: 'signed_out',
    });
    expect(provider.signOut).toHaveBeenCalledTimes(1);
  });

  it('delegates password reset requests', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(requestPasswordReset('user@example.com')).resolves.toEqual({
      status: 'code_sent',
    });
    expect(provider.requestPasswordReset).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it('delegates password reset verification', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(
      verifyPasswordResetOtp('user@example.com', '12345678'),
    ).resolves.toEqual({
      status: 'verified',
    });
    expect(provider.verifyPasswordResetOtp).toHaveBeenCalledWith(
      'user@example.com',
      '12345678',
    );
  });

  it('signs out and requires login on logout', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(logoutRemoteAccount()).resolves.toEqual({
      status: 'signed_out',
    });
    expect(provider.signOut).toHaveBeenCalledTimes(1);
    expect(mockSetAuthRequireLogin).toHaveBeenCalledTimes(1);
    expect(provider.bootstrapSession).not.toHaveBeenCalled();
  });

  it('returns sign-out errors without setting login required', async () => {
    const provider = createMockProvider({
      signOut: jest.fn().mockResolvedValue({
        status: 'error',
        message: 'network',
      }),
    });
    setAuthProvider(provider);

    await expect(logoutRemoteAccount()).resolves.toEqual({
      status: 'error',
      message: 'network',
    });
    expect(mockSetAuthRequireLogin).not.toHaveBeenCalled();
  });
});
