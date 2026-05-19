/** Anonymous user identity and future sign-in linking (Phase 1). */
export type {
  AuthSession,
  BootstrapAuthResult,
  RequestEmailLinkResult,
  VerifyEmailLinkResult,
} from './authTypes';
export {
  classifyEmailLinkError,
  isValidAccountEmail,
  normalizeAccountEmail,
  type EmailLinkErrorCode,
} from './accountEmailLink';
export type { AuthProvider } from './authProvider';
export {
  bootstrapAuthSession,
  getAuthAccessToken,
  getAuthSession,
  getAuthProvider,
  isRemoteAuthConfigured,
  requestEmailLink,
  verifyEmailLink,
  resetAuthProvider,
  setAuthProvider,
} from './authService';
export { createSupabaseAuthProvider } from './providers/supabaseAuthProvider';
export {
  ANONYMOUS_USER_ID_KEY,
  LEGACY_ANON_LINKED_KEY,
  generateAnonymousUserId,
  getLegacyAnonymousUserId,
  getOrCreateAnonymousUserId,
} from './identity';
export {
  linkLegacyAnonymousUserIfNeeded,
  type LinkLegacyAnonymousUserResult,
} from './legacyAnonymousLink';
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
export {
  useAuthAccountStatus,
  type AuthAccountStatusState,
} from './useAuthAccountStatus';
export { SaveMemoriesLink } from './SaveMemoriesLink';
export { canContinueOnboardingScan } from './canContinueOnboardingScan';
export {
  loadResolvedOnboardingState,
  resolveOnboardingAfterLoad,
} from './resolveOnboardingAfterLoad';
