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

const existingUserEnsureResult = {
  status: 'ensured' as const,
  response: {
    app_user_id: 'app_user_1',
    user_id: 'user-1',
    created_app_user: false,
    created_supabase_identity: false,
    created_email_identity: false,
  },
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

  it('uses signed-in session snapshot when provider session was cleared', async () => {
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(false);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(false);
    jest.mocked(getAuthProvider).mockReturnValue({
      getSession: jest.fn().mockResolvedValue(null),
    } as never);

    await expect(
      completeOnboardingForReturningLinkedUser({
        source: 'verify_sign_in_otp',
        ensureResult: existingUserEnsureResult,
        signedInSession: {
          userId: 'user-1',
          isAnonymous: false,
          email: 'user@example.com',
          emailConfirmed: true,
        },
      }),
    ).resolves.toBe(true);
  });

  it('marks onboarding complete for returning sign-in before email is fully linked', async () => {
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(false);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(false);
    jest.mocked(getAuthProvider).mockReturnValue({
      getSession: jest.fn().mockResolvedValue({
        userId: 'user-1',
        isAnonymous: false,
        email: 'user@example.com',
        emailConfirmed: false,
      }),
    } as never);

    await expect(
      completeOnboardingForReturningLinkedUser({
        source: 'verify_sign_in_otp',
        ensureResult: existingUserEnsureResult,
      }),
    ).resolves.toBe(true);
  });

  it('marks onboarding complete when signing in to an existing cloud account without local pet data', async () => {
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

    await expect(
      completeOnboardingForReturningLinkedUser({
        source: 'sign_in_with_password',
        ensureResult: existingUserEnsureResult,
      }),
    ).resolves.toBe(true);

    expect(saveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        step: 'complete',
      }),
    );
  });

  it('marks onboarding complete for returning Apple sign-in from onboarding welcome', async () => {
    jest.mocked(isLinkedRemoteAccount).mockReturnValue(true);
    jest.mocked(hasReadyLocalPetProfile).mockResolvedValue(false);
    jest.mocked(getAuthProvider).mockReturnValue({
      getSession: jest.fn().mockResolvedValue({
        userId: 'user-1',
        isAnonymous: false,
        email: 'apple@privaterelay.appleid.com',
        emailConfirmed: true,
      }),
    } as never);

    await expect(
      completeOnboardingForReturningLinkedUser({
        source: 'onboarding_apple',
        ensureResult: existingUserEnsureResult,
      }),
    ).resolves.toBe(true);
  });

  it('does not skip onboarding when linking email mid-flow without local pet data', async () => {
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

    await expect(
      completeOnboardingForReturningLinkedUser({
        source: 'verify_email_link',
        ensureResult: existingUserEnsureResult,
      }),
    ).resolves.toBe(false);

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
