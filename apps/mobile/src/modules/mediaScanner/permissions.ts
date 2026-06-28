import type * as MediaLibrary from 'expo-media-library/legacy';

export type PhotoPermissionStatus =
  'checking' | 'undetermined' | 'full' | 'limited' | 'denied' | 'unavailable';

export type PhotoPermissionResult = {
  status: PhotoPermissionStatus;
  canAskAgain: boolean;
};

export function normalizePhotoPermission(
  response: MediaLibrary.PermissionResponse,
): PhotoPermissionResult {
  if (response.status === 'undetermined') {
    return { status: 'undetermined', canAskAgain: response.canAskAgain };
  }

  if (!response.granted || response.status === 'denied') {
    return { status: 'denied', canAskAgain: response.canAskAgain };
  }

  if (response.accessPrivileges === 'limited') {
    return { status: 'limited', canAskAgain: response.canAskAgain };
  }

  return { status: 'full', canAskAgain: response.canAskAgain };
}

export function canScanPhotos(status: PhotoPermissionStatus): boolean {
  return status === 'full' || status === 'limited';
}
