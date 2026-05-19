/** Provider-agnostic remote auth session (canonical cloud user id). */
export type AuthSession = {
  userId: string;
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

export type BootstrapAuthResult =
  | { status: 'skipped' }
  | {
      status: 'ready';
      session: AuthSession;
      createdSession: boolean;
    }
  | { status: 'error'; message: string };
