import type { PhotoAccessState } from '@/modules/mediaScanner/usePhotoAccess';

export function canContinueOnboardingScan(
  photoAccess: Pick<
    PhotoAccessState,
    | 'isScanning'
    | 'isDetectingPets'
    | 'isClusteringEvents'
    | 'isSelectingImages'
    | 'permissionStatus'
    | 'initialScanCompleted'
    | 'errorMessage'
  >,
): boolean {
  const isPipelineActive =
    photoAccess.isScanning ||
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages;

  if (isPipelineActive) {
    return false;
  }

  if (photoAccess.permissionStatus === 'denied') {
    return true;
  }

  if (photoAccess.initialScanCompleted) {
    return true;
  }

  if (photoAccess.errorMessage) {
    return true;
  }

  return false;
}
