import * as MediaLibrary from 'expo-media-library/legacy';

import { canScanPhotos, normalizePhotoPermission } from './permissions';

function permission(
  overrides: Partial<MediaLibrary.PermissionResponse>,
): MediaLibrary.PermissionResponse {
  return {
    accessPrivileges: 'none',
    canAskAgain: true,
    expires: 'never',
    granted: false,
    status: MediaLibrary.PermissionStatus.UNDETERMINED,
    ...overrides,
  };
}

describe('normalizePhotoPermission', () => {
  it('maps full access when permission is granted without limited access', () => {
    const result = normalizePhotoPermission(
      permission({
        accessPrivileges: 'all',
        granted: true,
        status: MediaLibrary.PermissionStatus.GRANTED,
      }),
    );

    expect(result.status).toBe('full');
    expect(canScanPhotos(result.status)).toBe(true);
  });

  it('keeps limited access distinct from full access', () => {
    const result = normalizePhotoPermission(
      permission({
        accessPrivileges: 'limited',
        granted: true,
        status: MediaLibrary.PermissionStatus.GRANTED,
      }),
    );

    expect(result.status).toBe('limited');
    expect(canScanPhotos(result.status)).toBe(true);
  });

  it('maps denied access as unscannable', () => {
    const result = normalizePhotoPermission(
      permission({
        canAskAgain: false,
        status: MediaLibrary.PermissionStatus.DENIED,
      }),
    );

    expect(result).toEqual({ status: 'denied', canAskAgain: false });
    expect(canScanPhotos(result.status)).toBe(false);
  });
});
