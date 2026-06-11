/** Photo permission, camera-roll pagination, local asset extraction (Phase 0). */
export {
  canScanPhotos,
  normalizePhotoPermission,
  type PhotoPermissionResult,
  type PhotoPermissionStatus,
} from './permissions';
export {
  checkPhotoLibraryPermission,
  requestPhotoLibraryPermission,
  scanOlderPhotos,
  scanRecentPhotos,
  type ScanProgress,
} from './scanner';
export {
  getLastScanTimestamp,
  setLastScanTimestamp,
  LAST_SCAN_TIMESTAMP_KEY,
} from './scanState';
export { ScanProgressIndicator } from './components/ScanProgressIndicator';
export {
  computeOnboardingScanProgress,
  getScanProgressDetail,
  getScanProgressHeadline,
} from './scanProgress';
export { shouldEnableHistoricalScan } from './scanDepthPolicy';
export {
  ONBOARDING_SCAN_LIMITS,
  ONBOARDING_SCAN_MAX_IMAGES,
  ONBOARDING_SCAN_TARGET_MOMENTS,
  ONBOARDING_SCAN_WINDOW_DAYS,
  getOnboardingScanCreatedAfterMs,
  hasReachedOnboardingMomentTarget,
} from './onboardingScanPolicy';
export {
  runOnboardingLocalPipeline,
  type OnboardingLocalPipelineResult,
} from './runOnboardingLocalPipeline';
export { runOnboardingPetTypeTopUp } from './runOnboardingPetTypeTopUp';
export { usePhotoAccess, type PhotoAccessState } from './usePhotoAccess';
