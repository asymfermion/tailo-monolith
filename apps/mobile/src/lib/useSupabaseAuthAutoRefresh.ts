import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Supabase Auth auto-refresh reads the session from SecureStore on a timer.
 * On iOS, Keychain access fails with "User interaction is not allowed" while the
 * app is backgrounded or the device is locked — stop refresh until foreground.
 *
 * @see https://supabase.com/docs/reference/javascript/auth-startautorefresh
 */
export function useSupabaseAuthAutoRefresh(): void {
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const client = getSupabaseClient();

    const syncAutoRefresh = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void client.auth.startAutoRefresh();
        return;
      }

      void client.auth.stopAutoRefresh();
    };

    syncAutoRefresh(AppState.currentState);

    const subscription = AppState.addEventListener('change', syncAutoRefresh);

    return () => {
      subscription.remove();
      void client.auth.stopAutoRefresh();
    };
  }, []);
}
