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
export { usePhotoAccess, type PhotoAccessState } from './usePhotoAccess';
