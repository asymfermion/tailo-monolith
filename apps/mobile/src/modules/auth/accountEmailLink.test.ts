import {
  classifyEmailLinkError,
  isValidAccountEmail,
  normalizeAccountEmail,
} from './accountEmailLink';

describe('accountEmailLink', () => {
  it('normalizes email', () => {
    expect(normalizeAccountEmail('  User@Example.COM ')).toBe(
      'user@example.com',
    );
  });

  it('validates email shape', () => {
    expect(isValidAccountEmail('user@example.com')).toBe(true);
    expect(isValidAccountEmail('not-an-email')).toBe(false);
  });

  it('classifies identity-in-use errors', () => {
    expect(classifyEmailLinkError('User already registered')).toBe(
      'identity_in_use',
    );
  });
});
