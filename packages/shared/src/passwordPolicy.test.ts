import { describe, expect, it } from 'vitest';

import { getStrongPasswordIssues, isStrongPassword } from './passwordPolicy';

describe('passwordPolicy', () => {
  it('accepts passwords that meet all requirements', () => {
    expect(isStrongPassword('Password1!')).toBe(true);
    expect(getStrongPasswordIssues('Password1!')).toEqual([]);
  });

  it('rejects passwords that are too short', () => {
    expect(isStrongPassword('Pa1!')).toBe(false);
    expect(getStrongPasswordIssues('Pa1!')).toContain('too_short');
  });

  it('requires lowercase, uppercase, number, and special character', () => {
    expect(getStrongPasswordIssues('PASSWORD1!')).toContain(
      'missing_lowercase',
    );
    expect(getStrongPasswordIssues('password1!')).toContain(
      'missing_uppercase',
    );
    expect(getStrongPasswordIssues('Password!')).toContain('missing_number');
    expect(getStrongPasswordIssues('Password1')).toContain('missing_special');
  });

  it('uses trimmed length for minimum size', () => {
    expect(isStrongPassword('Pass1!   ')).toBe(false);
    expect(getStrongPasswordIssues('Pass1!   ')).toContain('too_short');
  });
});
