import {
  getAuthPasswordResetBlockReason,
  isAuthEmailSubmitReady,
  isAuthOtpSubmitReady,
  isAuthPasswordResetSubmitReady,
  isAuthPasswordSubmitReady,
} from './authFormReadiness';

const strongPassword = 'Password1!';

describe('authFormReadiness', () => {
  it('requires a valid email before submit', () => {
    expect(isAuthEmailSubmitReady('user@example.com')).toBe(true);
    expect(isAuthEmailSubmitReady('not-an-email')).toBe(false);
    expect(isAuthEmailSubmitReady('')).toBe(false);
  });

  it('requires a non-empty password for sign-in', () => {
    expect(isAuthPasswordSubmitReady('secret')).toBe(true);
    expect(isAuthPasswordSubmitReady('')).toBe(false);
    expect(isAuthPasswordSubmitReady('   ')).toBe(false);
  });

  it('requires a full OTP code before verify', () => {
    expect(isAuthOtpSubmitReady('12345678')).toBe(true);
    expect(isAuthOtpSubmitReady('1234567')).toBe(false);
    expect(isAuthOtpSubmitReady(' 12345678 ')).toBe(true);
  });

  it('requires matching strong passwords for reset', () => {
    expect(isAuthPasswordResetSubmitReady(strongPassword, strongPassword)).toBe(
      true,
    );
    expect(isAuthPasswordResetSubmitReady('password1', 'password1')).toBe(
      false,
    );
    expect(isAuthPasswordResetSubmitReady(strongPassword, 'Password1?')).toBe(
      false,
    );
    expect(
      isAuthPasswordResetSubmitReady(`  ${strongPassword}  `, strongPassword),
    ).toBe(true);
    expect(isAuthPasswordResetSubmitReady('   ', '   ')).toBe(false);
  });

  it('reports mismatch before weak password', () => {
    expect(getAuthPasswordResetBlockReason('Password1!', 'Password1?')).toBe(
      'mismatch',
    );
    expect(getAuthPasswordResetBlockReason('password1', 'password1')).toBe(
      'weak',
    );
  });
});
