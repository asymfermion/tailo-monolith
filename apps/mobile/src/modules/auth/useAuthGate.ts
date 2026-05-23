import { useCallback, useEffect, useState } from 'react';

import { logAuth } from './authLogger';
import { getAuthSession, isRemoteAuthConfigured } from './authService';
import { subscribeAuthSessionChanged } from './authSessionEvents';
import { isAuthRequireLogin } from './authRequireLogin';
import type { AuthSession } from './authTypes';

export type AuthGateState = {
  isLoading: boolean;
  requiresLogin: boolean;
  session: AuthSession | null;
  refresh: () => Promise<void>;
};

export async function resolveAuthGateSnapshot(): Promise<{
  requiresLogin: boolean;
  session: AuthSession | null;
}> {
  if (!isRemoteAuthConfigured()) {
    return { requiresLogin: false, session: null };
  }

  const requires = await isAuthRequireLogin();

  if (requires) {
    return { requiresLogin: true, session: null };
  }

  return {
    requiresLogin: false,
    session: await getAuthSession(),
  };
}

export function useAuthGate(): AuthGateState {
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    logAuth('Auth gate refresh started');

    try {
      const snapshot = await resolveAuthGateSnapshot();
      setRequiresLogin(snapshot.requiresLogin);
      setSession(snapshot.session);
      logAuth('Auth gate refresh finished', {
        requiresLogin: snapshot.requiresLogin,
        hasSession: Boolean(snapshot.session),
        userId: snapshot.session?.userId ?? null,
      });
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
    requiresLogin: requiresLogin && isRemoteAuthConfigured(),
    session,
    refresh,
  };
}
