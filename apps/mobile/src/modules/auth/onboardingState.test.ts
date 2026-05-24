import {
  initialOnboardingState,
  loadOnboardingState,
  mergeOnboardingState,
  ONBOARDING_STATE_KEY,
  resetOnboardingForAccountSignInIntent,
  saveOnboardingState,
} from './onboardingState';
import type { SecureStorage } from './secureStorage';

function createStorage(initialValue: string | null = null): SecureStorage & {
  setItemAsync: jest.Mock;
} {
  let value = initialValue;

  return {
    getItemAsync: jest.fn(async () => value),
    setItemAsync: jest.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
    deleteItemAsync: jest.fn(async () => {
      value = null;
    }),
  };
}

describe('onboarding state storage', () => {
  it('loads the initial state when nothing is stored', async () => {
    await expect(loadOnboardingState(createStorage())).resolves.toEqual(
      initialOnboardingState,
    );
  });

  it('saves onboarding state as JSON', async () => {
    const storage = createStorage();

    await saveOnboardingState(
      { ...initialOnboardingState, step: 'pet_name' },
      storage,
    );

    expect(storage.setItemAsync).toHaveBeenCalledWith(
      ONBOARDING_STATE_KEY,
      expect.stringContaining('"step":"pet_name"'),
    );
  });

  it('clears in-progress device setup for account sign-in intent', async () => {
    const storage = createStorage(
      JSON.stringify({
        step: 'scan',
        completed: false,
        completedFlags: {
          ...initialOnboardingState.completedFlags,
          identityCreated: true,
          photoPermissionHandled: true,
          scanStarted: true,
        },
      }),
    );

    await resetOnboardingForAccountSignInIntent(storage);

    await expect(loadOnboardingState(storage)).resolves.toEqual({
      ...initialOnboardingState,
      step: 'welcome',
      completed: false,
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        identityCreated: true,
      },
    });
  });

  it('merges completed flags without losing previous flags', () => {
    expect(
      mergeOnboardingState(initialOnboardingState, {
        step: 'pet_type',
        completedFlags: {
          identityCreated: true,
          petNameSet: true,
        },
      }),
    ).toEqual({
      ...initialOnboardingState,
      step: 'pet_type',
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        identityCreated: true,
        petNameSet: true,
      },
    });
  });
});
