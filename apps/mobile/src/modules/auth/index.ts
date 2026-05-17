/** Anonymous user identity and future sign-in linking (Phase 1). */
export {
  ANONYMOUS_USER_ID_KEY,
  generateAnonymousUserId,
  getOrCreateAnonymousUserId,
} from './identity';
export {
  initialOnboardingState,
  loadOnboardingState,
  mergeOnboardingState,
  ONBOARDING_STATE_KEY,
  saveOnboardingState,
  type OnboardingCompletedFlags,
  type OnboardingState,
  type OnboardingStatePatch,
  type OnboardingStep,
} from './onboardingState';
export { secureStorage, type SecureStorage } from './secureStorage';
export {
  useOnboardingSession,
  type OnboardingSessionState,
} from './useOnboardingSession';
