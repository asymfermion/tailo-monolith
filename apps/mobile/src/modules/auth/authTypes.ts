/** Provider-agnostic remote auth session (canonical cloud user id). */
export type AuthSession = {
  userId: string;
  /** Stable Tailo owner id from ensure-current-user (when resolved). */
  appUserId?: string;
  isAnonymous: boolean;
  email: string | null;
  emailConfirmed: boolean;
};

export type RequestEmailLinkResult =
  | { status: 'skipped' }
  | { status: 'already_linked' }
  | { status: 'code_sent' }
  | { status: 'error'; message: string };

export type VerifyEmailLinkResult =
  | { status: 'skipped' }
  | { status: 'verified'; session: AuthSession }
  | { status: 'error'; message: string };

export type RequestSignInResult =
  | { status: 'skipped' }
  | { status: 'code_sent' }
  | { status: 'error'; message: string };

/** Direct email registration (no anonymous session). */
export type RequestEmailSignUpResult = RequestSignInResult;

export type VerifyEmailSignUpResult = VerifyEmailLinkResult;

export type VerifySignInResult =
  | { status: 'skipped' }
  | { status: 'signed_in'; session: AuthSession }
  | { status: 'error'; message: string };

export type SetPasswordResult =
  | { status: 'skipped' }
  | { status: 'updated'; session: AuthSession | null }
  | { status: 'error'; message: string };

export type PasswordSignInResult =
  | { status: 'skipped' }
  | { status: 'signed_in'; session: AuthSession }
  | { status: 'error'; message: string };

export type RequestPasswordResetResult =
  | { status: 'skipped' }
  | { status: 'code_sent' }
  | { status: 'error'; message: string };

export type VerifyPasswordResetResult =
  | { status: 'skipped' }
  | { status: 'verified' }
  | { status: 'error'; message: string };

export type BootstrapAuthResult =
  | { status: 'skipped' }
  | { status: 'logged_out' }
  | {
      status: 'ready';
      session: AuthSession;
      createdSession: boolean;
    }
  | { status: 'error'; message: string };

export type SignOutResult =
  | { status: 'skipped' }
  | { status: 'signed_out' }
  | { status: 'error'; message: string };

export type LogoutResult =
  | { status: 'skipped' }
  | { status: 'signed_out' }
  | { status: 'error'; message: string };

/** Linked email account (not anonymous, email confirmed). */
export function isLinkedRemoteAccount(session: AuthSession | null): boolean {
  return Boolean(
    session && !session.isAnonymous && session.emailConfirmed && session.email,
  );
}
