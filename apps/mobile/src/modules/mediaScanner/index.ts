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
export { usePhotoAccess, type PhotoAccessState } from './usePhotoAccess';
