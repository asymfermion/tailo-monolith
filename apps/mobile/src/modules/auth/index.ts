/** Anonymous user identity and future sign-in linking (Phase 1). */
export type {
  AuthSession,
  BootstrapAuthResult,
  LogoutResult,
  PasswordSignInResult,
  RequestEmailLinkResult,
  RequestPasswordResetResult,
  RequestSignInResult,
  SetPasswordResult,
  SignOutResult,
  SocialSignInResult,
  VerifyEmailLinkResult,
  VerifyPasswordResetResult,
  VerifySignInResult,
} from './authTypes';
export {
  deriveAccountAuthMethods,
  formatAccountSettingsLabel,
  resolveAccountLinkState,
  type AccountAuthMethod,
  type AccountAuthMethodId,
  type AccountLinkState,
} from './accountAuthMethods';
export { isLinkedRemoteAccount } from './authTypes';
export { logAuth } from './authLogger';
export {
  classifyEmailLinkError,
  isValidAccountEmail,
  normalizeAccountEmail,
  type EmailLinkErrorCode,
} from './accountEmailLink';
export type { AuthProvider } from './authProvider';
export {
  ensureAnonymousCloudAccountIfNeeded,
  prepareAppRemoteAuth,
  shouldBootstrapRemoteAuthAtStartup,
  type EnsureAnonymousCloudAccountResult,
  type PrepareAppRemoteAuthResult,
} from './anonymousCloudAccount';
export {
  bootstrapAuthSession,
  ensureRemoteAuthSession,
  finalizeConnectedSignIn,
  getAuthAccessToken,
  getAuthSession,
  getAuthProvider,
  isRemoteAuthConfigured,
  logoutRemoteAccount,
  requestEmailLink,
  requestEmailSignUp,
  requestPasswordReset,
  requestSignInOtp,
  setAccountPassword,
  signInWithApple,
  signInWithGoogle,
  signInWithPassword,
  signOutRemoteSession,
  verifyEmailLink,
  verifyEmailSignUp,
  verifyPasswordResetOtp,
  verifySignInOtp,
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
  completeEmailAccountConnection,
  type CompleteEmailAccountConnectionResult,
} from './completeEmailAccountConnection';
export {
  linkLegacyAnonymousUserIfNeeded,
  type LinkLegacyAnonymousUserResult,
} from './legacyAnonymousLink';
export {
  APP_USER_ID_KEY,
  clearTailoAppUserIdCache,
  getTailoAppUserId,
} from './appUserId';
export {
  ensureCurrentUserIfNeeded,
  type EnsureCurrentUserIfNeededResult,
} from './ensureCurrentUser';
export {
  applyRemoteAccountProfile,
  fetchRemoteAccountProfile,
  loadRemoteAccountProfile,
  pullRemoteAccountProfileIfNeeded,
  seedLocalAccountPrefsToCloudIfEmpty,
  syncRemoteAccountProfile,
  type PullRemoteAccountProfileResult,
  type RemoteAccountProfile,
  type SyncRemoteAccountProfilePatch,
  type SyncRemoteAccountProfileResult,
} from './remoteAccountProfile';
export {
  loadLocalAccountProfile,
  saveLocalAccountProfile,
  type LocalAccountProfile,
} from './localAccountProfile';
export {
  saveAccountProfile,
  type SaveAccountProfilePatch,
  type SaveAccountProfileResult,
} from './persistAccountProfile';
export {
  setAppFontStyleAndSyncProfile,
  setAppLocaleAndSyncProfile,
  setAppThemeAndSyncProfile,
  type PersistAppPreferenceResult,
} from './persistAppPreferenceAndSync';
export { useRemoteAccountProfile } from './useRemoteAccountProfile';
export {
  initialOnboardingState,
  loadOnboardingState,
  mergeOnboardingState,
  ONBOARDING_STATE_KEY,
  resetOnboardingForAccountSignInIntent,
  saveOnboardingState,
  type OnboardingCompletedFlags,
  type OnboardingState,
  type OnboardingStatePatch,
  type OnboardingStep,
} from './onboardingState';
export { secureStorage, type SecureStorage } from './secureStorage';
export {
  INSTALL_ID_KEY,
  clearSecureUserData,
  reconcileInstallIdentity,
  type InstallReconcileResult,
} from './installIdentity';
export {
  resetLocalDeviceData,
  type ResetLocalDeviceDataOptions,
} from './resetLocalDeviceData';
export {
  deleteRemoteAccountIfPossible,
  type DeleteRemoteAccountResult,
} from './deleteRemoteAccount';
export {
  useOnboardingSession,
  type OnboardingSessionState,
} from './useOnboardingSession';
export {
  useAuthAccountStatus,
  type AuthAccountStatusState,
} from './useAuthAccountStatus';
export {
  useAuthGate,
  resolveAuthGateSnapshot,
  type AuthGateState,
} from './useAuthGate';
export {
  clearAuthRequireLogin,
  isAuthRequireLogin,
  setAuthRequireLogin,
} from './authRequireLogin';
export { SaveMemoriesLink } from './SaveMemoriesLink';
export { AnonymousAccountUpgradeForm } from './components/AnonymousAccountUpgradeForm';
export { ConnectedAccountProfileForm } from './components/ConnectedAccountProfileForm';
export { UserProfileHeader } from './components/UserProfileHeader';
export { canContinueOnboardingScan } from './canContinueOnboardingScan';
export {
  loadResolvedOnboardingState,
  resolveOnboardingAfterLoad,
} from './resolveOnboardingAfterLoad';
