import {
  initialOnboardingState,
  loadOnboardingState,
  mergeOnboardingState,
  ONBOARDING_STATE_KEY,
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
