import {
  shouldPreferSignInOnWelcome,
  shouldShowAccountActionsOnWelcome,
} from './onboardingWelcomeActions';

describe('shouldPreferSignInOnWelcome', () => {
  it('prefers sign-in only for linked accounts with local data', () => {
    expect(
      shouldPreferSignInOnWelcome({
        isRemoteAuthConfigured: true,
        isLinkedAccount: true,
        hasExistingLocalData: true,
      }),
    ).toBe(true);
  });

  it('keeps start primary when the user is not linked', () => {
    expect(
      shouldPreferSignInOnWelcome({
        isRemoteAuthConfigured: true,
        isLinkedAccount: false,
        hasExistingLocalData: true,
      }),
    ).toBe(false);
  });

  it('keeps start primary when there is no local data', () => {
    expect(
      shouldPreferSignInOnWelcome({
        isRemoteAuthConfigured: true,
        isLinkedAccount: true,
        hasExistingLocalData: false,
      }),
    ).toBe(false);
  });
});

describe('shouldShowAccountActionsOnWelcome', () => {
  it('shows account actions for users without a linked account', () => {
    expect(
      shouldShowAccountActionsOnWelcome({
        isRemoteAuthConfigured: true,
        isLinkedAccount: false,
      }),
    ).toBe(true);
  });

  it('hides sign-in and create-account actions for linked users', () => {
    expect(
      shouldShowAccountActionsOnWelcome({
        isRemoteAuthConfigured: true,
        isLinkedAccount: true,
      }),
    ).toBe(false);
  });

  it('hides account actions when remote auth is unavailable', () => {
    expect(
      shouldShowAccountActionsOnWelcome({
        isRemoteAuthConfigured: false,
        isLinkedAccount: false,
      }),
    ).toBe(false);
  });
});
