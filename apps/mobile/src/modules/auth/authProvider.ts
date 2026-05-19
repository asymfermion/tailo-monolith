import type {
  AuthSession,
  BootstrapAuthResult,
  RequestEmailLinkResult,
  VerifyEmailLinkResult,
} from './authTypes';

/**
 * Remote auth boundary — swap Supabase for another host without touching screens.
 * Implementations live under `modules/auth/providers/`.
 */
export interface AuthProvider {
  readonly kind: string;
  isConfigured(): boolean;
  bootstrapSession(): Promise<BootstrapAuthResult>;
  getSession(): Promise<AuthSession | null>;
  /** JWT or bearer token for HTTP sync APIs; null when offline / not configured. */
  getAccessToken(): Promise<string | null>;
  /** Sends a verification code to link email to the current (anonymous) user. */
  requestEmailLink(email: string): Promise<RequestEmailLinkResult>;
  /** Confirms the OTP from updateUser; same auth user id when successful. */
  verifyEmailLink(email: string, token: string): Promise<VerifyEmailLinkResult>;
}
