import type { PhotoPermissionStatus } from '@/modules/mediaScanner/permissions';

export type CameraPermissionStatus =
  'checking' | 'undetermined' | 'granted' | 'denied';

type PermissionLabelKey =
  | 'settings.permissionStatusFullAccess'
  | 'settings.permissionStatusLimitedAccess'
  | 'settings.permissionStatusAllowed'
  | 'settings.permissionStatusDenied'
  | 'settings.permissionStatusNotSet'
  | 'settings.permissionStatusChecking'
  | 'settings.permissionStatusUnavailable';

export function getPhotoPermissionLabelKey(
  status: PhotoPermissionStatus,
): PermissionLabelKey {
  switch (status) {
    case 'full':
      return 'settings.permissionStatusFullAccess';
    case 'limited':
      return 'settings.permissionStatusLimitedAccess';
    case 'denied':
      return 'settings.permissionStatusDenied';
    case 'undetermined':
      return 'settings.permissionStatusNotSet';
    case 'checking':
      return 'settings.permissionStatusChecking';
    case 'unavailable':
      return 'settings.permissionStatusUnavailable';
  }
}

export function getCameraPermissionLabelKey(
  status: CameraPermissionStatus,
): PermissionLabelKey {
  switch (status) {
    case 'granted':
      return 'settings.permissionStatusAllowed';
    case 'denied':
      return 'settings.permissionStatusDenied';
    case 'undetermined':
      return 'settings.permissionStatusNotSet';
    case 'checking':
      return 'settings.permissionStatusChecking';
  }
}
