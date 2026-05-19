import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

import {
  classifyEmailLinkError,
  isValidAccountEmail,
  normalizeAccountEmail,
} from '../accountEmailLink';
import type { AuthProvider } from '../authProvider';
import type {
  AuthSession,
  BootstrapAuthResult,
  RequestEmailLinkResult,
  VerifyEmailLinkResult,
} from '../authTypes';

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
      const {
        data: { session },
      } = await client.auth.getSession();

      if (!session?.user) {
        return { status: 'skipped' };
      }

      if (!session.user.is_anonymous) {
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

      if (!isValidAccountEmail(normalizedEmail) || otp.length < 6) {
        return {
          status: 'error',
          message: 'Enter the 6-digit code from your email.',
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
  };
}
