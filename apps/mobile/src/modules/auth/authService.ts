import type { AuthProvider } from './authProvider';
import type {
  AuthSession,
  BootstrapAuthResult,
  RequestEmailLinkResult,
  VerifyEmailLinkResult,
} from './authTypes';
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

export function isRemoteAuthConfigured(): boolean {
  return authProvider.isConfigured();
}

export async function bootstrapAuthSession(): Promise<BootstrapAuthResult> {
  return authProvider.bootstrapSession();
}

export async function getAuthSession(): Promise<AuthSession | null> {
  return authProvider.getSession();
}

export async function getAuthAccessToken(): Promise<string | null> {
  return authProvider.getAccessToken();
}

export async function requestEmailLink(
  email: string,
): Promise<RequestEmailLinkResult> {
  return authProvider.requestEmailLink(email);
}

export async function verifyEmailLink(
  email: string,
  token: string,
): Promise<VerifyEmailLinkResult> {
  return authProvider.verifyEmailLink(email, token);
}
