import {
  deriveAccountAuthMethods,
  formatAccountSettingsLabel,
  resolveAccountLinkState,
} from './accountAuthMethods';
import type { AuthSession } from './authTypes';

const linkedSession: AuthSession = {
  userId: 'auth-1',
  appUserId: 'app-1',
  isAnonymous: false,
  email: 'user@example.com',
  emailConfirmed: true,
};

const anonymousSession: AuthSession = {
  userId: 'auth-2',
  isAnonymous: true,
  email: null,
  emailConfirmed: false,
};

describe('resolveAccountLinkState', () => {
  it('returns linked for verified email accounts', () => {
    expect(resolveAccountLinkState(linkedSession)).toBe('linked');
  });

  it('returns anonymous otherwise', () => {
    expect(resolveAccountLinkState(anonymousSession)).toBe('anonymous');
    expect(resolveAccountLinkState(null)).toBe('anonymous');
  });
});

describe('deriveAccountAuthMethods', () => {
  it('marks email connected when the session is linked', () => {
    expect(deriveAccountAuthMethods(linkedSession)).toEqual([
      { id: 'email', status: 'connected' },
      { id: 'apple', status: 'available' },
      { id: 'google', status: 'available' },
    ]);
  });

  it('marks email available for anonymous sessions', () => {
    expect(deriveAccountAuthMethods(anonymousSession)[0]).toEqual({
      id: 'email',
      status: 'available',
    });
  });
});

describe('formatAccountSettingsLabel', () => {
  it('prefers display name over email', () => {
    expect(
      formatAccountSettingsLabel({
        session: linkedSession,
        displayName: 'Mochi parent',
      }),
    ).toBe('Mochi parent');
  });

  it('falls back to email', () => {
    expect(
      formatAccountSettingsLabel({
        session: linkedSession,
        displayName: null,
      }),
    ).toBe('user@example.com');
  });
});
