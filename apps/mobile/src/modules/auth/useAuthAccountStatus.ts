import { useCallback, useEffect, useState } from 'react';

import type { AuthSession } from './authTypes';
import { isLinkedRemoteAccount } from './authTypes';
import { getAuthSession, isRemoteAuthConfigured } from './authService';
import { subscribeAuthSessionChanged } from './authSessionEvents';

export type AuthAccountStatusState = {
  isLoading: boolean;
  isConfigured: boolean;
  session: AuthSession | null;
  authUserId: string | null;
  appUserId: string | null;
  isAnonymous: boolean;
  email: string | null;
  emailConfirmed: boolean;
  isLinked: boolean;
  refresh: () => Promise<void>;
};

export function useAuthAccountStatus(): AuthAccountStatusState {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      if (!isRemoteAuthConfigured()) {
        setSession(null);
        return;
      }

      setSession(await getAuthSession());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeAuthSessionChanged(refresh), [refresh]);

  return {
    isLoading,
    isConfigured: isRemoteAuthConfigured(),
    session,
    authUserId: session?.userId ?? null,
    appUserId: session?.appUserId ?? null,
    isAnonymous: session?.isAnonymous ?? true,
    email: session?.email ?? null,
    emailConfirmed: session?.emailConfirmed ?? false,
    isLinked: isLinkedRemoteAccount(session),
    refresh,
  };
}
