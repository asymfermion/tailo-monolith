import { formatCount, pluralSuffix, t } from '../t';
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

  if (photoAccess.isScanning) {
    return t('scanPipeline.headlineScanning');
  }

  if (photoAccess.isDetectingPets) {
    return t('scanPipeline.headlineDetecting');
  }

  if (photoAccess.isClusteringEvents) {
    return t('scanPipeline.headlineClustering');
  }

  if (photoAccess.isSelectingImages) {
    return t('scanPipeline.headlineSelecting');
  }

  if (photoAccess.permissionStatus === 'checking') {
    return t('scanPipeline.headlineChecking');
  }

  return t('scanPipeline.headlinePreparing');
}

export function getScanProgressDetail(photoAccess: PhotoAccessState): string {
  if (photoAccess.initialScanCompleted) {
    const count = photoAccess.petDetectionProgress.petCandidateCount;

    return t('scanPipeline.detailReady', {
      count: formatCount(count),
      plural: pluralSuffix(count),
    });
  }

  if (photoAccess.isScanning) {
    const count = photoAccess.progress.scannedCount;

    return t('scanPipeline.detailScanning', {
      count: formatCount(count),
      photoPlural: pluralSuffix(count),
    });
  }

  if (photoAccess.isDetectingPets) {
    const { processedCount, totalCount } = photoAccess.petDetectionProgress;

    if (totalCount > 0) {
      return t('scanPipeline.detailDetectingProgress', {
        processed: formatCount(processedCount),
        total: formatCount(totalCount),
      });
    }

    return t('scanPipeline.detailDetecting');
  }

  if (photoAccess.isClusteringEvents) {
    return t('scanPipeline.detailClustering');
  }

  if (photoAccess.isSelectingImages) {
    const count = photoAccess.bestImageSelectionProgress.selectedAssetCount;

    return t('scanPipeline.detailSelecting', {
      count: formatCount(count),
      photoPlural: pluralSuffix(count),
    });
  }

  return t('scanPipeline.detailDefault');
}
