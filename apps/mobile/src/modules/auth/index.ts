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
  INSTALL_ID_KEY,
  reconcileInstallIdentity,
  type InstallReconcileResult,
} from './installIdentity';
export {
  useOnboardingSession,
  type OnboardingSessionState,
} from './useOnboardingSession';
export { canContinueOnboardingScan } from './canContinueOnboardingScan';
export {
  loadResolvedOnboardingState,
  resolveOnboardingAfterLoad,
} from './resolveOnboardingAfterLoad';
