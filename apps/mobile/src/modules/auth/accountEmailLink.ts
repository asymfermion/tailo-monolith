/** Normalizes email for Supabase updateUser / verifyOtp. */
export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidAccountEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeAccountEmail(email));
}

export type EmailLinkErrorCode =
  | 'invalid_email'
  | 'identity_in_use'
  | 'rate_limited'
  | 'session_missing'
  | 'unknown';

export function classifyEmailLinkError(message: string): EmailLinkErrorCode {
  const lower = message.toLowerCase();

  if (
    lower.includes('already') &&
    (lower.includes('registered') ||
      lower.includes('exists') ||
      lower.includes('identity'))
  ) {
    return 'identity_in_use';
  }

  if (lower.includes('invalid') && lower.includes('email')) {
    return 'invalid_email';
  }

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'rate_limited';
  }

  if (lower.includes('session') && lower.includes('missing')) {
    return 'session_missing';
  }

  return 'unknown';
}
