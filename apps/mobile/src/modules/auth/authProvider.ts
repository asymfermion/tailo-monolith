import type {
  AuthSession,
  BootstrapAuthResult,
  PasswordSignInResult,
  RequestEmailLinkResult,
  RequestEmailSignUpResult,
  RequestPasswordResetResult,
  RequestSignInResult,
  SetPasswordResult,
  SignOutResult,
  VerifyEmailLinkResult,
  VerifyEmailSignUpResult,
  VerifyPasswordResetResult,
  VerifySignInResult,
  SocialSignInResult,
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
  /** Sends a verification code to register a new email account. */
  requestEmailSignUp(email: string): Promise<RequestEmailSignUpResult>;
  verifyEmailSignUp(
    email: string,
    token: string,
  ): Promise<VerifyEmailSignUpResult>;
  /** Sets a password on the current verified account. */
  setPassword(password: string): Promise<SetPasswordResult>;
  /** Sends a sign-in OTP for a returning linked account (after logout). */
  requestSignInOtp(email: string): Promise<RequestSignInResult>;
  verifySignInOtp(email: string, token: string): Promise<VerifySignInResult>;
  requestPasswordReset(email: string): Promise<RequestPasswordResetResult>;
  verifyPasswordResetOtp(
    email: string,
    token: string,
  ): Promise<VerifyPasswordResetResult>;
  signInWithPassword(
    email: string,
    password: string,
  ): Promise<PasswordSignInResult>;
  signInWithGoogle(options?: {
    mode?: 'sign_in' | 'link';
  }): Promise<SocialSignInResult>;
  /** Best-effort profile name from auth identity metadata (e.g. Google full_name). */
  getIdentityDisplayName?(): Promise<string | null>;
  /** Clears the current remote session (local data unchanged). */
  signOut(): Promise<SignOutResult>;
}
