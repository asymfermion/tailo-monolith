import { t } from '../t';
import type { PhotoAccessState } from '@/modules/mediaScanner/usePhotoAccess';

export function getScanPipelineStepLabel(
  stepId: 'scan' | 'detect' | 'cluster' | 'select',
): string {
  switch (stepId) {
    case 'scan':
      return t('scanPipeline.stepPhotos');
    case 'detect':
      return t('scanPipeline.stepPetMoments');
    case 'cluster':
      return t('scanPipeline.stepGrouping');
    case 'select':
      return t('scanPipeline.stepBestPicks');
  }
}

export function getScanProgressHeadline(photoAccess: PhotoAccessState): string {
  if (photoAccess.initialScanCompleted) {
    return t('scanPipeline.headlineReady');
  }

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
    return t('scanPipeline.headlineDetecting');
  }

  if (photoAccess.isScanning) {
    return t('scanPipeline.headlineScanning');
  }

  if (photoAccess.permissionStatus === 'checking') {
    return t('scanPipeline.headlineChecking');
  }

  return t('scanPipeline.headlinePreparing');
}

export function getScanProgressDetail(photoAccess: PhotoAccessState): string {
  if (photoAccess.initialScanCompleted) {
    return t('scanPipeline.detailReady');
  }

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
    return t('scanPipeline.detailDetecting');
  }

  if (photoAccess.isScanning) {
    return t('scanPipeline.detailScanning');
  }

  return t('scanPipeline.detailDefault');
}
