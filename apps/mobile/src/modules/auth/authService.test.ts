import type { AuthProvider } from './authProvider';
import {
  bootstrapAuthSession,
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
  requestEmailLink,
  resetAuthProvider,
  setAuthProvider,
  verifyEmailLink,
} from './authService';

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
    verifyEmailLink: jest.fn().mockResolvedValue({
      status: 'verified',
      session: {
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      },
    }),
    ...overrides,
  };
}

describe('authService', () => {
  beforeEach(() => {
    resetAuthProvider();
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

  it('delegates session and token reads', async () => {
    const provider = createMockProvider();
    setAuthProvider(provider);

    await expect(getAuthSession()).resolves.toEqual({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    await expect(getAuthAccessToken()).resolves.toBe('token-abc');
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
  });
});
