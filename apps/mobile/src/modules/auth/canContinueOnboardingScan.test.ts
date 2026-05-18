import { canContinueOnboardingScan } from './canContinueOnboardingScan';

const idlePhotoAccess = {
  isScanning: false,
  isDetectingPets: false,
  isClusteringEvents: false,
  isSelectingImages: false,
  permissionStatus: 'full' as const,
  initialScanCompleted: false,
  errorMessage: null,
};

describe('canContinueOnboardingScan', () => {
  it('blocks continue until the initial scan pass finishes', () => {
    expect(canContinueOnboardingScan(idlePhotoAccess)).toBe(false);
    expect(
      canContinueOnboardingScan({
        ...idlePhotoAccess,
        initialScanCompleted: true,
      }),
    ).toBe(true);
  });

  it('blocks continue while pipeline is active', () => {
    expect(
      canContinueOnboardingScan({
        ...idlePhotoAccess,
        isDetectingPets: true,
        initialScanCompleted: true,
      }),
    ).toBe(false);
  });

  it('allows continue when photo access is denied', () => {
    expect(
      canContinueOnboardingScan({
        ...idlePhotoAccess,
        permissionStatus: 'denied',
      }),
    ).toBe(true);
  });
});
