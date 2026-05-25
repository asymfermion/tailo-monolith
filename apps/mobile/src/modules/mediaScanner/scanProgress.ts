import { getScanPipelineStepLabel } from '@/i18n';

import type { PhotoAccessState } from './usePhotoAccess';

export { getScanProgressDetail, getScanProgressHeadline } from '@/i18n';

export const PROFILE_PHOTO_SUGGESTION_COUNT = 3;

export type ScanPipelineStep = {
  id: 'scan' | 'detect' | 'cluster' | 'select';
  label: string;
  status: 'pending' | 'active' | 'complete';
};

export function getScanPipelineSteps(
  photoAccess: PhotoAccessState,
): ScanPipelineStep[] {
  const { initialScanCompleted } = photoAccess;

  const scanComplete =
    initialScanCompleted ||
    (!photoAccess.isScanning &&
      (photoAccess.progress.scannedCount > 0 ||
        photoAccess.isDetectingPets ||
        photoAccess.isClusteringEvents ||
        photoAccess.isSelectingImages));

  const detectComplete =
    initialScanCompleted ||
    (!photoAccess.isDetectingPets &&
      (photoAccess.petDetectionProgress.processedCount > 0 ||
        photoAccess.isClusteringEvents ||
        photoAccess.isSelectingImages));

  const clusterComplete =
    initialScanCompleted ||
    (!photoAccess.isClusteringEvents &&
      (photoAccess.eventClusteringProgress.persistedCount > 0 ||
        photoAccess.isSelectingImages));

  const selectComplete = initialScanCompleted;

  return [
    {
      id: 'scan',
      label: getScanPipelineStepLabel('scan'),
      status: getStepStatus(photoAccess.isScanning, scanComplete),
    },
    {
      id: 'detect',
      label: getScanPipelineStepLabel('detect'),
      status: getStepStatus(photoAccess.isDetectingPets, detectComplete),
    },
    {
      id: 'cluster',
      label: getScanPipelineStepLabel('cluster'),
      status: getStepStatus(photoAccess.isClusteringEvents, clusterComplete),
    },
    {
      id: 'select',
      label: getScanPipelineStepLabel('select'),
      status: getStepStatus(photoAccess.isSelectingImages, selectComplete),
    },
  ];
}

function getStepStatus(
  isActive: boolean,
  isComplete: boolean,
): ScanPipelineStep['status'] {
  if (isActive) {
    return 'active';
  }

  if (isComplete) {
    return 'complete';
  }

  return 'pending';
}

export function computeOnboardingScanProgress(
  photoAccess: PhotoAccessState,
): number {
  if (photoAccess.initialScanCompleted) {
    return 1;
  }

  if (photoAccess.isScanning) {
    const scanRatio = Math.min(photoAccess.progress.scannedCount / 250, 1);
    return 0.08 + scanRatio * 0.27;
  }

  if (photoAccess.isDetectingPets) {
    const { processedCount, totalCount } = photoAccess.petDetectionProgress;
    const detectRatio =
      totalCount > 0 ? Math.min(processedCount / totalCount, 1) : 0.15;
    return 0.35 + detectRatio * 0.3;
  }

  if (photoAccess.isClusteringEvents) {
    return 0.72;
  }

  if (photoAccess.isSelectingImages) {
    return 0.88;
  }

  return 0.05;
}

export function isOnboardingScanPipelineActive(
  photoAccess: PhotoAccessState,
): boolean {
  return (
    !photoAccess.initialScanCompleted &&
    (photoAccess.isScanning ||
      photoAccess.isDetectingPets ||
      photoAccess.isClusteringEvents ||
      photoAccess.isSelectingImages ||
      photoAccess.permissionStatus === 'checking')
  );
}
