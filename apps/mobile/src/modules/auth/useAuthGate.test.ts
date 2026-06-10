import type { AuthProvider } from './authProvider';
import { resolveAuthGateSnapshot } from './useAuthGate';
import { resetAuthProvider, setAuthProvider } from './authService';

const mockIsAuthRequireLogin = jest.fn();

jest.mock('./authRequireLogin', () => ({
  isAuthRequireLogin: () => mockIsAuthRequireLogin(),
}));

function createMockProvider(
  overrides: Partial<AuthProvider> = {},
): AuthProvider {
  return {
    kind: 'mock',
    isConfigured: () => true,
    bootstrapSession: jest.fn(),
    getSession: jest.fn().mockResolvedValue({
      userId: 'user-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    }),
    getAccessToken: jest.fn(),
    requestEmailLink: jest.fn(),
    verifyEmailLink: jest.fn(),
    requestEmailSignUp: jest.fn(),
    verifyEmailSignUp: jest.fn(),
    setPassword: jest.fn(),
    requestSignInOtp: jest.fn(),
    verifySignInOtp: jest.fn(),
    requestPasswordReset: jest.fn(),
    verifyPasswordResetOtp: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    signOut: jest.fn(),
    ...overrides,
  };
}

describe('resolveAuthGateSnapshot', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetAuthProvider();
    mockIsAuthRequireLogin.mockResolvedValue(false);
  });

  afterEach(() => {
    resetAuthProvider();
  });

  it('requires login when the logout gate flag is set', async () => {
    mockIsAuthRequireLogin.mockResolvedValue(true);
    setAuthProvider(createMockProvider());

    await expect(resolveAuthGateSnapshot()).resolves.toEqual({
      requiresLogin: true,
      session: null,
    });
  });

  it('returns the active session when login is not required', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(resolveAuthGateSnapshot()).resolves.toEqual({
      requiresLogin: false,
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    });
    expect(provider.getSession).toHaveBeenCalledTimes(1);
  });

  it('skips remote auth when Supabase is not configured', async () => {
    setAuthProvider(
      createMockProvider({
        isConfigured: () => false,
      }),
    );

    await expect(resolveAuthGateSnapshot()).resolves.toEqual({
      requiresLogin: false,
      session: null,
    });
    expect(mockIsAuthRequireLogin).not.toHaveBeenCalled();
  });
});
