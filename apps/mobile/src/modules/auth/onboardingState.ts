import { workspaceSecureStorage } from './localWorkspace';
import { type SecureStorage } from './secureStorage';

export type OnboardingStep =
  | 'welcome'
  | 'photo_permission'
  | 'scan'
  | 'pet_select'
  | 'timeline_preview'
  | 'pet_name'
  | 'pet_type'
  | 'pet_gender'
  | 'profile_photo'
  | 'pet_profile'
  | 'complete';

export type OnboardingCompletedFlags = {
  identityCreated: boolean;
  privacyAcknowledged: boolean;
  photoPermissionHandled: boolean;
  scanStarted: boolean;
  timelinePreviewSeen: boolean;
  petNameSet: boolean;
  petSelected: boolean;
  petTypeSet: boolean;
  petGenderSet: boolean;
  profilePhotoSuggested: boolean;
};

export type OnboardingState = {
  step: OnboardingStep;
  completed: boolean;
  completionSource?: 'local_setup' | 'returning_account';
  completedFlags: OnboardingCompletedFlags;
};

export type OnboardingStatePatch = Omit<
  Partial<OnboardingState>,
  'completedFlags'
> & {
  completedFlags?: Partial<OnboardingCompletedFlags>;
};

export const ONBOARDING_STATE_KEY = 'tailo.onboarding_state';

export const initialOnboardingState: OnboardingState = {
  step: 'welcome',
  completed: false,
  completedFlags: {
    identityCreated: false,
    privacyAcknowledged: false,
    photoPermissionHandled: false,
    scanStarted: false,
    timelinePreviewSeen: false,
    petNameSet: false,
    petSelected: false,
    petTypeSet: false,
    petGenderSet: false,
    profilePhotoSuggested: false,
  },
};

export async function loadOnboardingState(
  storage: SecureStorage = workspaceSecureStorage,
): Promise<OnboardingState> {
  const storedValue = await storage.getItemAsync(ONBOARDING_STATE_KEY);

  if (!storedValue) {
    return initialOnboardingState;
  }

  try {
    return normalizeOnboardingState(JSON.parse(storedValue));
  } catch {
    return initialOnboardingState;
  }
}

export async function saveOnboardingState(
  state: OnboardingState,
  storage: SecureStorage = workspaceSecureStorage,
): Promise<void> {
  await storage.setItemAsync(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

/**
 * Clears in-progress device onboarding (e.g. after "Start on this device" + back)
 * so signing in to an existing account takes priority over partial local setup.
 */
export async function resetOnboardingForAccountSignInIntent(
  storage: SecureStorage = workspaceSecureStorage,
): Promise<void> {
  const stored = await loadOnboardingState(storage);

  if (stored.completed) {
    return;
  }

  await saveOnboardingState(
    mergeOnboardingState(stored, {
      step: 'welcome',
      completed: false,
      completedFlags: {
        privacyAcknowledged: false,
        photoPermissionHandled: false,
        scanStarted: false,
        timelinePreviewSeen: false,
        petNameSet: false,
        petSelected: false,
        petTypeSet: false,
        petGenderSet: false,
        profilePhotoSuggested: false,
      },
    }),
    storage,
  );
}

export function mergeOnboardingState(
  currentState: OnboardingState,
  nextState: OnboardingStatePatch,
): OnboardingState {
  return {
    ...currentState,
    ...nextState,
    completedFlags: {
      ...currentState.completedFlags,
      ...nextState.completedFlags,
    },
  };
}

function normalizeOnboardingState(value: unknown): OnboardingState {
  if (!isObject(value)) {
    return initialOnboardingState;
  }

  return {
    step: isOnboardingStep(value.step)
      ? value.step
      : initialOnboardingState.step,
    completed:
      typeof value.completed === 'boolean'
        ? value.completed
        : initialOnboardingState.completed,
    completionSource:
      value.completionSource === 'local_setup' ||
      value.completionSource === 'returning_account'
        ? value.completionSource
        : undefined,
    completedFlags: {
      ...initialOnboardingState.completedFlags,
      ...(isObject(value.completedFlags) ? value.completedFlags : {}),
    },
  };
}

function isOnboardingStep(value: unknown): value is OnboardingStep {
  return (
    value === 'welcome' ||
    value === 'photo_permission' ||
    value === 'scan' ||
    value === 'pet_select' ||
    value === 'timeline_preview' ||
    value === 'pet_name' ||
    value === 'pet_type' ||
    value === 'pet_gender' ||
    value === 'profile_photo' ||
    value === 'pet_profile' ||
    value === 'complete'
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
