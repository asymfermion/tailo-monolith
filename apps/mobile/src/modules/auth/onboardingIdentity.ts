import { logAuth } from './authLogger';
import { getOrCreateAnonymousUserId } from './identity';
import type { AuthSession } from './authTypes';

/**
 * Identity used for onboarding UI and local workspace selection.
 * Falls back to a device-local id when remote anonymous bootstrap is unavailable.
 */
export async function resolveOnboardingIdentityId(
  session: AuthSession | null,
): Promise<string> {
  if (session?.userId) {
    return session.userId;
  }

  const localId = await getOrCreateAnonymousUserId();
  logAuth(
    'Using local onboarding identity until a remote session is available',
    { userIdPrefix: localId.slice(0, 16) },
  );
  return localId;
}
