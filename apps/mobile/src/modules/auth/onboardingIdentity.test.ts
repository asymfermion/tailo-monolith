import type { AuthSession } from './authTypes';
import { getOrCreateAnonymousUserId } from './identity';
import { resolveOnboardingIdentityId } from './onboardingIdentity';

jest.mock('./identity', () => ({
  getOrCreateAnonymousUserId: jest.fn(),
}));

describe('resolveOnboardingIdentityId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getOrCreateAnonymousUserId).mockResolvedValue('anon_local_1');
  });

  it('uses the remote session user id without changing local workspace', async () => {
    const session: AuthSession = {
      userId: 'supabase-user',
      appUserId: 'app-user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    };

    await expect(resolveOnboardingIdentityId(session)).resolves.toBe(
      'supabase-user',
    );
    expect(getOrCreateAnonymousUserId).not.toHaveBeenCalled();
  });

  it('does not require an app user id for onboarding identity', async () => {
    const session: AuthSession = {
      userId: 'supabase-user',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    };

    await expect(resolveOnboardingIdentityId(session)).resolves.toBe(
      'supabase-user',
    );
  });

  it('falls back to a local anonymous id when there is no remote session', async () => {
    await expect(resolveOnboardingIdentityId(null)).resolves.toBe(
      'anon_local_1',
    );
    expect(getOrCreateAnonymousUserId).toHaveBeenCalledTimes(1);
  });
});
