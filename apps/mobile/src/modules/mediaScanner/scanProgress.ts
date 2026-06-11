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
  const scanStarted =
    photoAccess.isScanning ||
    photoAccess.progress.batchCount > 0 ||
    photoAccess.progress.scannedCount > 0;
  const processingStarted =
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages ||
    photoAccess.petDetectionProgress.processedCount > 0 ||
    photoAccess.eventClusteringProgress.eventCandidateCount > 0 ||
    photoAccess.eventClusteringProgress.persistedCount > 0 ||
    photoAccess.bestImageSelectionProgress.scoredAssetCount > 0 ||
    photoAccess.bestImageSelectionProgress.selectedAssetCount > 0;

  const scanStatus: ScanPipelineStep['status'] = initialScanCompleted
    ? 'complete'
    : processingStarted
      ? 'complete'
      : scanStarted
        ? 'active'
        : 'pending';

  const detectStatus: ScanPipelineStep['status'] = initialScanCompleted
    ? 'complete'
    : processingStarted
      ? 'active'
      : 'pending';

  const clusterStatus: ScanPipelineStep['status'] = initialScanCompleted
    ? 'complete'
    : 'pending';

  const selectStatus: ScanPipelineStep['status'] = initialScanCompleted
    ? 'complete'
    : 'pending';

  return [
    {
      id: 'scan',
      label: getScanPipelineStepLabel('scan'),
      status: scanStatus,
    },
    {
      id: 'detect',
      label: getScanPipelineStepLabel('detect'),
      status: detectStatus,
    },
    {
      id: 'cluster',
      label: getScanPipelineStepLabel('cluster'),
      status: clusterStatus,
    },
    {
      id: 'select',
      label: getScanPipelineStepLabel('select'),
      status: selectStatus,
    },
  ];
}

export function computeOnboardingScanProgress(
  photoAccess: PhotoAccessState,
): number {
  if (photoAccess.initialScanCompleted) {
    return 1;
  }

  const scanStarted =
    photoAccess.isScanning ||
    photoAccess.progress.batchCount > 0 ||
    photoAccess.progress.scannedCount > 0;
  const processingStarted =
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages ||
    photoAccess.petDetectionProgress.processedCount > 0 ||
    photoAccess.eventClusteringProgress.eventCandidateCount > 0 ||
    photoAccess.eventClusteringProgress.persistedCount > 0 ||
    photoAccess.bestImageSelectionProgress.scoredAssetCount > 0 ||
    photoAccess.bestImageSelectionProgress.selectedAssetCount > 0;

  if (processingStarted) {
    const stage = Math.min(photoAccess.petDetectionProgress.batchCount, 10);
    return 0.5 + stage * 0.02;
  }

  if (scanStarted) {
    const stage = Math.min(photoAccess.progress.batchCount, 6);
    return 0.12 + stage * 0.05;
  }

  return photoAccess.permissionStatus === 'checking' ? 0.04 : 0.08;
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
