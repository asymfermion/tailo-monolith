import type { AuthProvider } from './authProvider';
import { createSupabaseAuthProvider } from './providers/supabaseAuthProvider';

let authProvider: AuthProvider = createSupabaseAuthProvider();

/** @internal Override provider in tests or a future non-Supabase backend. */
export function setAuthProvider(provider: AuthProvider): void {
  authProvider = provider;
}

/** @internal Reset to the default Supabase-backed provider. */
export function resetAuthProvider(): void {
  authProvider = createSupabaseAuthProvider();
}

export function getAuthProvider(): AuthProvider {
  return authProvider;
}
