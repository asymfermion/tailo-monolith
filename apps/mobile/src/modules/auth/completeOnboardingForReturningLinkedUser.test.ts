import { completeOnboardingForReturningLinkedUser } from './completeOnboardingForReturningLinkedUser';
import { getAuthProvider } from './authProviderInstance';
import { isLinkedRemoteAccount } from './authTypes';
import {
  initialOnboardingState,
  loadOnboardingState,
  saveOnboardingState,
} from './onboardingState';

jest.mock('./authRequireLogin', () => ({
  isAuthRequireLogin: jest.fn().mockResolvedValue(false),
}));

jest.mock('./authProviderInstance', () => ({
  getAuthProvider: jest.fn(),
}));

jest.mock('./authTypes', () => ({
  isLinkedRemoteAccount: jest.fn(),
}));

jest.mock('@/modules/pets', () => ({
  hasReadyLocalPetProfile: jest.fn(),
}));

jest.mock('./onboardingState', () => ({
  initialOnboardingState: {
    step: 'welcome',
    completed: false,
    completedFlags: {
      identityCreated: false,
      photoPermissionHandled: false,
      scanStarted: false,
      timelinePreviewSeen: false,
      petNameSet: false,
      petSelected: false,
      petTypeSet: false,
      petGenderSet: false,
      profilePhotoSuggested: false,
    },
  },
  loadOnboardingState: jest.fn(),
  mergeOnboardingState:
    jest.requireActual('./onboardingState').mergeOnboardingState,
  saveOnboardingState: jest.fn(),
}));

const { hasReadyLocalPetProfile } = jest.requireMock('@/modules/pets') as {
  hasReadyLocalPetProfile: jest.Mock;
};

describe('completeOnboardingForReturningLinkedUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(loadOnboardingState).mockResolvedValue(initialOnboardingState);
    jest.mocked(saveOnboardingState).mockResolvedValue(undefined);
  });

  it('marks onboarding complete when a linked user already has a local pet profile', async () => {
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(true);
    jest.mocked(getAuthProvider).mockReturnValue({
      getSession: jest.fn().mockResolvedValue({
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      }),
    } as never);

    await expect(completeOnboardingForReturningLinkedUser()).resolves.toBe(
      true,
    );

    expect(saveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        step: 'complete',
      }),
    );
  });

  it('keeps onboarding open for new linked users without a local pet profile', async () => {
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(false);
    jest.mocked(getAuthProvider).mockReturnValue({
      getSession: jest.fn().mockResolvedValue({
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: true,
      }),
    } as never);

    await expect(completeOnboardingForReturningLinkedUser()).resolves.toBe(
      false,
    );

    expect(saveOnboardingState).not.toHaveBeenCalled();
  });

  it('no-ops when the account is not linked', async () => {
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(false);
    jest.mocked(getAuthProvider).mockReturnValue({
      getSession: jest.fn().mockResolvedValue({
        userId: 'user-1',
        isAnonymous: true,
        email: null,
        emailConfirmed: false,
      }),
    } as never);

    await expect(completeOnboardingForReturningLinkedUser()).resolves.toBe(
      false,
    );

    expect(saveOnboardingState).not.toHaveBeenCalled();
    expect(hasReadyLocalPetProfile).not.toHaveBeenCalled();
  });
});
