import type { AuthSession } from './authTypes';
import { isLinkedRemoteAccount } from './authTypes';

export type AccountAuthMethodId = 'email' | 'apple' | 'google';

export type AccountAuthMethodStatus = 'connected' | 'available' | 'coming_soon';

export type AccountAuthMethod = {
  id: AccountAuthMethodId;
  status: AccountAuthMethodStatus;
};

export type AccountLinkState = 'anonymous' | 'linked';

export function resolveAccountLinkState(
  session: AuthSession | null,
): AccountLinkState {
  return isLinkedRemoteAccount(session) ? 'linked' : 'anonymous';
}

/**
 * Sign-in methods shown on the connected account profile (Phase 4).
 * Provider identity detection is separate; these mark which methods can be linked.
 */
export function deriveAccountAuthMethods(
  session: AuthSession | null,
): AccountAuthMethod[] {
  const emailConnected = isLinkedRemoteAccount(session);

  return [
    {
      id: 'email',
      status: emailConnected ? 'connected' : 'available',
    },
    { id: 'apple', status: 'available' },
    { id: 'google', status: 'available' },
  ];
}

export function formatAccountSettingsLabel(input: {
  session: AuthSession | null;
  displayName: string | null;
}): string {
  const trimmed = input.displayName?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (input.session?.email) {
    return input.session.email;
  }

  return '';
}
