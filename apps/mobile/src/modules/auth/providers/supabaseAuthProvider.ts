import {
  ACCOUNT_PASSWORD_REQUIREMENTS_MESSAGE,
  isStrongPassword,
} from '@tailo/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Linking } from 'react-native';

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { logAuth } from '../authLogger';

import {
  classifyEmailLinkError,
  isValidAccountEmail,
  normalizeAccountEmail,
} from '../accountEmailLink';
import type { AuthProvider } from '../authProvider';
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
} from '../authTypes';

const EMAIL_OTP_LENGTH = 8;
const OAUTH_REDIRECT_URI = 'tailo://auth/callback';
const OAUTH_TIMEOUT_MS = 120_000;

function mapUser(user: {
  id: string;
  is_anonymous?: boolean;
  email?: string | null;
  email_confirmed_at?: string | null;
}): AuthSession {
  return {
    userId: user.id,
    isAnonymous: user.is_anonymous ?? false,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}

function emailLinkErrorMessage(message: string): string {
  switch (classifyEmailLinkError(message)) {
    case 'identity_in_use':
      return 'That email is already linked to another account.';
    case 'invalid_email':
      return 'Enter a valid email address.';
    case 'rate_limited':
      return 'Too many attempts. Try again in a few minutes.';
    case 'session_missing':
      return 'Your session expired. Restart the app and try again.';
    default:
      return message || 'Could not update your account.';
  }
}

type AnonymousSessionEnsureResult =
  | { status: 'ready'; userId: string; isAnonymous: boolean }
  | { status: 'error'; message: string };

/** Anonymous upgrade path only — links email onto the current device session. */
async function ensureAnonymousAuthSession(
  client: SupabaseClient,
): Promise<AnonymousSessionEnsureResult> {
  const {
    data: { session: existingSession },
  } = await client.auth.getSession();

  if (existingSession?.user) {
    return {
      status: 'ready',
      userId: existingSession.user.id,
      isAnonymous: existingSession.user.is_anonymous ?? false,
    };
  }

  logAuth('Creating anonymous auth session for account email link');

  const { data, error } = await client.auth.signInAnonymously();

  if (error) {
    return { status: 'error', message: error.message };
  }

  const user = data.user ?? data.session?.user;

  if (!user) {
    return {
      status: 'error',
      message: 'Could not start account setup on this device.',
    };
  }

  return {
    status: 'ready',
    userId: user.id,
    isAnonymous: user.is_anonymous ?? true,
  };
}

function passwordErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('password should be at least') ||
    normalized.includes('password is too short')
  ) {
    return ACCOUNT_PASSWORD_REQUIREMENTS_MESSAGE;
  }

  if (normalized.includes('invalid login credentials')) {
    return 'That email or password does not look right.';
  }

  return message || 'Could not update your password.';
}

function parseUrlParams(url: string): {
  query: URLSearchParams;
  hash: URLSearchParams;
} {
  const parsed = new URL(url);
  const query = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  return { query, hash };
}

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function completeOAuthInApp(
  client: SupabaseClient,
  authUrl: string,
): Promise<{
  status: 'signed_in';
  session: AuthSession;
} | { status: 'error'; message: string }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      subscription.remove();
      resolve({
        status: 'error',
        message: 'Google sign-in timed out. Please try again.',
      });
    }, OAUTH_TIMEOUT_MS);

    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (!url.startsWith(OAUTH_REDIRECT_URI)) {
        return;
      }

      subscription.remove();
      clearTimeout(timeout);

      try {
        const { query, hash } = parseUrlParams(url);
        const errorDescription =
          hash.get('error_description') ?? query.get('error_description');

        if (errorDescription) {
          resolve({
            status: 'error',
            message: decodeURIComponent(errorDescription),
          });
          return;
        }

        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const code = query.get('code');

        if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            resolve({ status: 'error', message: error.message });
            return;
          }
        } else if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);

          if (error) {
            resolve({ status: 'error', message: error.message });
            return;
          }
        }

        const {
          data: { session },
        } = await client.auth.getSession();
        const user = session?.user;

        if (!user) {
          resolve({
            status: 'error',
            message: 'Could not complete Google sign-in.',
          });
          return;
        }

        resolve({ status: 'signed_in', session: mapUser(user) });
      } catch (error) {
        resolve({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Google sign-in failed.',
        });
      }
    });

    void Linking.openURL(authUrl).catch((error) => {
      subscription.remove();
      clearTimeout(timeout);
      resolve({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Could not open Google sign-in.',
      });
    });
  });
}

export function createSupabaseAuthProvider(): AuthProvider {
  return {
    kind: 'supabase',

    isConfigured() {
      return isSupabaseConfigured();
    },

    async getSession() {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const {
        data: { session },
        error,
      } = await getSupabaseClient().auth.getSession();

      if (error || !session?.user) {
        return null;
      }

      return mapUser(session.user);
    },

    async getAccessToken() {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const {
        data: { session },
      } = await getSupabaseClient().auth.getSession();

      return session?.access_token ?? null;
    },

    async bootstrapSession(): Promise<BootstrapAuthResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const client = getSupabaseClient();
      const {
        data: { session: existingSession },
        error: sessionError,
      } = await client.auth.getSession();

      if (sessionError) {
        return { status: 'error', message: sessionError.message };
      }

      if (existingSession?.user) {
        return {
          status: 'ready',
          session: mapUser(existingSession.user),
          createdSession: false,
        };
      }

      const { data, error } = await client.auth.signInAnonymously();

      if (error) {
        return { status: 'error', message: error.message };
      }

      const session = data.session;
      const user = data.user ?? session?.user;

      if (!user) {
        return {
          status: 'error',
          message: 'Could not start a remote auth session.',
        };
      }

      return {
        status: 'ready',
        session: mapUser(user),
        createdSession: true,
      };
    },

    async requestEmailLink(email: string): Promise<RequestEmailLinkResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);

      if (!isValidAccountEmail(normalizedEmail)) {
        return { status: 'error', message: 'Enter a valid email address.' };
      }

      const client = getSupabaseClient();
      const sessionResult = await ensureAnonymousAuthSession(client);

      if (sessionResult.status === 'error') {
        return { status: 'error', message: sessionResult.message };
      }

      if (!sessionResult.isAnonymous) {
        return { status: 'already_linked' };
      }

      const { error } = await client.auth.updateUser({
        email: normalizedEmail,
      });

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      return { status: 'code_sent' };
    },

    async verifyEmailLink(
      email: string,
      token: string,
    ): Promise<VerifyEmailLinkResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);
      const otp = token.trim();

      if (
        !isValidAccountEmail(normalizedEmail) ||
        otp.length < EMAIL_OTP_LENGTH
      ) {
        return {
          status: 'error',
          message: 'Enter the 8-digit code from your email.',
        };
      }

      const client = getSupabaseClient();
      const { data, error } = await client.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: 'email_change',
      });

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      const user = data.user ?? data.session?.user;

      if (!user) {
        return {
          status: 'error',
          message: 'Could not verify your email. Try again.',
        };
      }

      return {
        status: 'verified',
        session: mapUser(user),
      };
    },

    async requestEmailSignUp(email: string): Promise<RequestEmailSignUpResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);

      if (!isValidAccountEmail(normalizedEmail)) {
        return { status: 'error', message: 'Enter a valid email address.' };
      }

      const client = getSupabaseClient();
      const {
        data: { session },
      } = await client.auth.getSession();

      if (session?.user && !session.user.is_anonymous) {
        return {
          status: 'error',
          message: 'That email is already linked to an account on this device.',
        };
      }

      if (session?.user?.is_anonymous) {
        logAuth('Signing out anonymous session before direct email sign-up');
        await client.auth.signOut();
      }

      const { error } = await client.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      return { status: 'code_sent' };
    },

    async verifyEmailSignUp(
      email: string,
      token: string,
    ): Promise<VerifyEmailSignUpResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);
      const otp = token.trim();

      if (
        !isValidAccountEmail(normalizedEmail) ||
        otp.length < EMAIL_OTP_LENGTH
      ) {
        return {
          status: 'error',
          message: 'Enter the 8-digit code from your email.',
        };
      }

      const client = getSupabaseClient();
      const { data, error } = await client.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: 'email',
      });

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      const user = data.user ?? data.session?.user;

      if (!user) {
        return {
          status: 'error',
          message: 'Could not verify your email. Try again.',
        };
      }

      const session = mapUser(user);

      if (session.isAnonymous || !session.emailConfirmed) {
        return {
          status: 'error',
          message: 'Could not finish creating your account. Try again.',
        };
      }

      return {
        status: 'verified',
        session,
      };
    },

    async setPassword(password: string): Promise<SetPasswordResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      if (!isStrongPassword(password)) {
        return {
          status: 'error',
          message: ACCOUNT_PASSWORD_REQUIREMENTS_MESSAGE,
        };
      }

      const client = getSupabaseClient();
      const { error } = await client.auth.updateUser({
        password,
      });

      if (error) {
        return {
          status: 'error',
          message: passwordErrorMessage(error.message),
        };
      }

      const {
        data: { session },
      } = await client.auth.getSession();

      return {
        status: 'updated',
        session: session?.user ? mapUser(session.user) : null,
      };
    },

    async requestSignInOtp(email: string): Promise<RequestSignInResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);

      if (!isValidAccountEmail(normalizedEmail)) {
        return { status: 'error', message: 'Enter a valid email address.' };
      }

      const { error } = await getSupabaseClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      return { status: 'code_sent' };
    },

    async verifySignInOtp(
      email: string,
      token: string,
    ): Promise<VerifySignInResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);
      const otp = token.trim();

      if (
        !isValidAccountEmail(normalizedEmail) ||
        otp.length < EMAIL_OTP_LENGTH
      ) {
        return {
          status: 'error',
          message: 'Enter the 8-digit code from your email.',
        };
      }

      const { data, error } = await getSupabaseClient().auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: 'email',
      });

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      const user = data.user ?? data.session?.user;

      if (!user) {
        return {
          status: 'error',
          message: 'Could not sign in. Try again.',
        };
      }

      const session = mapUser(user);

      if (session.isAnonymous || !session.emailConfirmed) {
        return {
          status: 'error',
          message: 'This email is not linked to a saved account yet.',
        };
      }

      return {
        status: 'signed_in',
        session,
      };
    },

    async requestPasswordReset(
      email: string,
    ): Promise<RequestPasswordResetResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);

      if (!isValidAccountEmail(normalizedEmail)) {
        return { status: 'error', message: 'Enter a valid email address.' };
      }

      const { error } =
        await getSupabaseClient().auth.resetPasswordForEmail(normalizedEmail);

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      return { status: 'code_sent' };
    },

    async verifyPasswordResetOtp(
      email: string,
      token: string,
    ): Promise<VerifyPasswordResetResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);
      const otp = token.trim();

      if (
        !isValidAccountEmail(normalizedEmail) ||
        otp.length < EMAIL_OTP_LENGTH
      ) {
        return {
          status: 'error',
          message: 'Enter the 8-digit code from your email.',
        };
      }

      const { error } = await getSupabaseClient().auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: 'recovery',
      });

      if (error) {
        return {
          status: 'error',
          message: emailLinkErrorMessage(error.message),
        };
      }

      return { status: 'verified' };
    },

    async signInWithPassword(
      email: string,
      password: string,
    ): Promise<PasswordSignInResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const normalizedEmail = normalizeAccountEmail(email);

      if (!isValidAccountEmail(normalizedEmail)) {
        return { status: 'error', message: 'Enter a valid email address.' };
      }

      if (!password) {
        return { status: 'error', message: 'Enter your password.' };
      }

      const { data, error } = await getSupabaseClient().auth.signInWithPassword(
        {
          email: normalizedEmail,
          password,
        },
      );

      if (error) {
        logAuth('Supabase password sign-in failed', {
          code: error.code ?? null,
          message: error.message,
        });
        return {
          status: 'error',
          message: passwordErrorMessage(error.message),
        };
      }

      const user = data.user ?? data.session?.user;

      if (!user) {
        return {
          status: 'error',
          message: 'Could not sign in. Try again.',
        };
      }

      const session = mapUser(user);

      if (session.isAnonymous || !session.emailConfirmed) {
        return {
          status: 'error',
          message: 'This email is not linked to a saved account yet.',
        };
      }

      return {
        status: 'signed_in',
        session,
      };
    },

    async signInWithGoogle(
      options?: {
        mode?: 'sign_in' | 'link';
      },
    ): Promise<SocialSignInResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const client = getSupabaseClient();
      const mode = options?.mode ?? 'sign_in';

      if (mode === 'link') {
        const {
          data: { session },
        } = await client.auth.getSession();

        if (!session?.user?.is_anonymous) {
          return {
            status: 'error',
            message: 'Google can only be linked from an anonymous session.',
          };
        }

        const { data, error } = await client.auth.linkIdentity({
          provider: 'google',
          options: {
            redirectTo: OAUTH_REDIRECT_URI,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          return { status: 'error', message: error.message };
        }

        if (!data?.url) {
          return {
            status: 'error',
            message: 'Google link flow did not start.',
          };
        }

        const result = await completeOAuthInApp(client, data.url);

        if (result.status === 'error') {
          return result;
        }

        if (result.session.isAnonymous) {
          return {
            status: 'error',
            message: 'Google account was not linked. Please try again.',
          };
        }

        return result;
      }

      const {
        data: { session },
      } = await client.auth.getSession();

      if (session?.user?.is_anonymous) {
        const { error: signOutError } = await client.auth.signOut();

        if (signOutError) {
          return { status: 'error', message: signOutError.message };
        }
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: OAUTH_REDIRECT_URI,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { status: 'error', message: error.message };
      }

      if (!data?.url) {
        return { status: 'error', message: 'Google sign-in did not start.' };
      }

      const result = await completeOAuthInApp(client, data.url);

      if (result.status === 'error') {
        return result;
      }

      if (result.session.isAnonymous) {
        return {
          status: 'error',
          message: 'This Google account is not linked to a saved account yet.',
        };
      }

      return result;
    },

    async getIdentityDisplayName(): Promise<string | null> {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const {
        data: { user: currentUser },
      } = await getSupabaseClient().auth.getUser();

      const user =
        currentUser ??
        (await getSupabaseClient().auth.getSession()).data.session?.user ??
        null;

      if (!user) {
        return null;
      }

      const metadata = user.user_metadata ?? {};

      return (
        normalizeDisplayName(metadata.full_name) ??
        normalizeDisplayName(metadata.name) ??
        null
      );
    },

    async signOut(): Promise<SignOutResult> {
      if (!isSupabaseConfigured()) {
        return { status: 'skipped' };
      }

      const { error } = await getSupabaseClient().auth.signOut();

      if (error) {
        return { status: 'error', message: error.message };
      }

      return { status: 'signed_out' };
    },
  };
}
