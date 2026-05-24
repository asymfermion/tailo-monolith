import { isStrongPassword, MIN_ACCOUNT_PASSWORD_LENGTH } from '@tailo/shared';

import { isValidAccountEmail } from '@/modules/auth/accountEmailLink';

export { MIN_ACCOUNT_PASSWORD_LENGTH };

export const MIN_EMAIL_OTP_LENGTH = 8;

export type AuthPasswordResetBlockReason = 'weak' | 'mismatch';

export function isRequiredTextReady(value: string): boolean {
  return value.trim().length > 0;
}

export function isAuthEmailSubmitReady(email: string): boolean {
  return isValidAccountEmail(email);
}

export function isAuthPasswordSubmitReady(password: string): boolean {
  return isRequiredTextReady(password);
}

export function isAuthOtpSubmitReady(code: string): boolean {
  return code.trim().length >= MIN_EMAIL_OTP_LENGTH;
}

export function getAuthPasswordResetBlockReason(
  password: string,
  confirmPassword: string,
): AuthPasswordResetBlockReason | null {
  const trimmedPassword = password.trim();
  const trimmedConfirm = confirmPassword.trim();

  if (trimmedPassword !== trimmedConfirm) {
    return 'mismatch';
  }

  if (!isStrongPassword(trimmedPassword)) {
    return 'weak';
  }

  return null;
}

export function isAuthPasswordResetSubmitReady(
  password: string,
  confirmPassword: string,
): boolean {
  return getAuthPasswordResetBlockReason(password, confirmPassword) === null;
}
