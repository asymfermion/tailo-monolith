import { useCallback, useEffect, useState } from 'react';

import type { AuthSession } from './authTypes';
import { getAuthSession, isRemoteAuthConfigured } from './authService';

export type AuthAccountStatusState = {
  isLoading: boolean;
  isConfigured: boolean;
  session: AuthSession | null;
  isAnonymous: boolean;
  email: string | null;
  emailConfirmed: boolean;
  refresh: () => Promise<void>;
};

export function useAuthAccountStatus(): AuthAccountStatusState {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isRemoteAuthConfigured()) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    const nextSession = await getAuthSession();
    setSession(nextSession);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    isLoading,
    isConfigured: isRemoteAuthConfigured(),
    session,
    isAnonymous: session?.isAnonymous ?? true,
    email: session?.email ?? null,
    emailConfirmed: session?.emailConfirmed ?? false,
    refresh,
  };
}
