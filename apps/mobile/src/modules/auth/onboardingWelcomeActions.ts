/** Welcome onboarding: when sign-in should appear above local start. */
export function shouldPreferSignInOnWelcome(options: {
  isRemoteAuthConfigured: boolean;
  isLinkedAccount: boolean;
  hasExistingLocalData: boolean;
}): boolean {
  return (
    options.isRemoteAuthConfigured &&
    options.isLinkedAccount &&
    options.hasExistingLocalData
  );
}

/** Hide account actions once the user is already registered/linked. */
export function shouldShowAccountActionsOnWelcome(options: {
  isRemoteAuthConfigured: boolean;
  isLinkedAccount: boolean;
}): boolean {
  return options.isRemoteAuthConfigured && !options.isLinkedAccount;
}
