import {
  handleLoginSocialSignInResult,
  handleOnboardingSocialSignInResult,
  isSocialSignInCancelMessage,
} from './socialSignInFlow';
import { loadOnboardingState } from './onboardingState';

jest.mock('./onboardingState', () => ({
  loadOnboardingState: jest.fn(),
}));

describe('socialSignInFlow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('treats provider cancel messages as benign', () => {
    expect(isSocialSignInCancelMessage('Apple sign-in was canceled.')).toBe(
      true,
    );
    expect(isSocialSignInCancelMessage('The user denied access')).toBe(true);
    expect(isSocialSignInCancelMessage('Invalid credentials')).toBe(false);
  });

  it('continues device onboarding after a new social sign-in', async () => {
    jest.mocked(loadOnboardingState).mockResolvedValue({
      step: 'welcome',
      completed: false,
      completionSource: undefined,
      completedFlags: {
        identityCreated: false,
        privacyAcknowledged: true,
        photoPermissionHandled: false,
        scanStarted: false,
        timelinePreviewSeen: false,
        petNameSet: false,
        petSelected: false,
        petTypeSet: false,
        petGenderSet: false,
        profilePhotoSuggested: false,
      },
    });
    const startOnThisDevice = jest.fn().mockResolvedValue(undefined);
    const setErrorMessage = jest.fn();

    await handleOnboardingSocialSignInResult(
      {
        status: 'signed_in',
        session: {
          userId: 'user-1',
          isAnonymous: false,
          email: 'user@example.com',
          emailConfirmed: true,
        },
      },
      { startOnThisDevice, setErrorMessage },
    );

    expect(startOnThisDevice).toHaveBeenCalledTimes(1);
    expect(setErrorMessage).not.toHaveBeenCalled();
  });

  it('skips device onboarding when onboarding already completed', async () => {
    jest.mocked(loadOnboardingState).mockResolvedValue({
      step: 'complete',
      completed: true,
      completionSource: 'returning_account',
      completedFlags: {
        identityCreated: true,
        privacyAcknowledged: true,
        photoPermissionHandled: true,
        scanStarted: true,
        timelinePreviewSeen: true,
        petNameSet: true,
        petSelected: true,
        petTypeSet: true,
        petGenderSet: false,
        profilePhotoSuggested: true,
      },
    });
    const startOnThisDevice = jest.fn().mockResolvedValue(undefined);

    await handleOnboardingSocialSignInResult(
      {
        status: 'signed_in',
        session: {
          userId: 'user-1',
          isAnonymous: false,
          email: 'user@example.com',
          emailConfirmed: true,
        },
      },
      { startOnThisDevice, setErrorMessage: jest.fn() },
    );

    expect(startOnThisDevice).not.toHaveBeenCalled();
  });

  it('finishes login after social sign-in success', () => {
    const finishSignIn = jest.fn();
    const onSignedIn = jest.fn();
    const setErrorMessage = jest.fn();

    handleLoginSocialSignInResult(
      {
        status: 'signed_in',
        session: {
          userId: 'user-1',
          isAnonymous: false,
          email: 'user@example.com',
          emailConfirmed: true,
        },
      },
      { finishSignIn, onSignedIn, setErrorMessage },
    );

    expect(finishSignIn).toHaveBeenCalledTimes(1);
    expect(onSignedIn).toHaveBeenCalledTimes(1);
    expect(setErrorMessage).not.toHaveBeenCalled();
  });

  it('does not surface cancel errors on login', () => {
    const setErrorMessage = jest.fn();

    handleLoginSocialSignInResult(
      { status: 'error', message: 'Apple sign-in was canceled.' },
      {
        finishSignIn: jest.fn(),
        onSignedIn: jest.fn(),
        setErrorMessage,
      },
    );

    expect(setErrorMessage).not.toHaveBeenCalled();
  });

  it('does not surface provider errors on onboarding', async () => {
    const setErrorMessage = jest.fn();

    await handleOnboardingSocialSignInResult(
      { status: 'error', message: 'Nonces mismatch' },
      {
        startOnThisDevice: jest.fn(),
        setErrorMessage,
      },
    );

    expect(setErrorMessage).not.toHaveBeenCalled();
  });

  it('does not surface provider errors on login', () => {
    const setErrorMessage = jest.fn();

    handleLoginSocialSignInResult(
      { status: 'error', message: 'Nonces mismatch' },
      {
        finishSignIn: jest.fn(),
        onSignedIn: jest.fn(),
        setErrorMessage,
      },
    );

    expect(setErrorMessage).not.toHaveBeenCalled();
  });
});
