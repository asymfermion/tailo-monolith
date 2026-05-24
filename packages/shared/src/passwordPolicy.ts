export const MIN_ACCOUNT_PASSWORD_LENGTH = 8;

export type StrongPasswordIssue =
  | 'too_short'
  | 'missing_lowercase'
  | 'missing_uppercase'
  | 'missing_number'
  | 'missing_special';

export const ACCOUNT_PASSWORD_REQUIREMENTS_MESSAGE =
  'Use at least 8 characters with uppercase, lowercase, a number, and a special character.';

const LOWERCASE_PATTERN = /[a-z]/;
const UPPERCASE_PATTERN = /[A-Z]/;
const NUMBER_PATTERN = /[0-9]/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;

export function getStrongPasswordIssues(
  password: string,
): StrongPasswordIssue[] {
  const trimmed = password.trim();
  const issues: StrongPasswordIssue[] = [];

  if (trimmed.length < MIN_ACCOUNT_PASSWORD_LENGTH) {
    issues.push('too_short');
  }

  if (!LOWERCASE_PATTERN.test(trimmed)) {
    issues.push('missing_lowercase');
  }

  if (!UPPERCASE_PATTERN.test(trimmed)) {
    issues.push('missing_uppercase');
  }

  if (!NUMBER_PATTERN.test(trimmed)) {
    issues.push('missing_number');
  }

  if (!SPECIAL_CHARACTER_PATTERN.test(trimmed)) {
    issues.push('missing_special');
  }

  return issues;
}

export function isStrongPassword(password: string): boolean {
  return getStrongPasswordIssues(password).length === 0;
}
