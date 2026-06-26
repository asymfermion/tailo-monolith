import {
  getCameraPermissionLabelKey,
  getPhotoPermissionLabelKey,
} from './devicePermissionLabels';

describe('devicePermissionLabels', () => {
  it('maps photo permission statuses to label keys', () => {
    expect(getPhotoPermissionLabelKey('full')).toBe(
      'settings.permissionStatusFullAccess',
    );
    expect(getPhotoPermissionLabelKey('limited')).toBe(
      'settings.permissionStatusLimitedAccess',
    );
    expect(getPhotoPermissionLabelKey('denied')).toBe(
      'settings.permissionStatusDenied',
    );
  });

  it('maps camera permission statuses to label keys', () => {
    expect(getCameraPermissionLabelKey('granted')).toBe(
      'settings.permissionStatusAllowed',
    );
    expect(getCameraPermissionLabelKey('denied')).toBe(
      'settings.permissionStatusDenied',
    );
  });
});
