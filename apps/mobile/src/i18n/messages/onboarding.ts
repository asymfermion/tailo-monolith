import { pluralSuffix, t } from '../t';
import type { PhotoAccessState } from '@/modules/mediaScanner/usePhotoAccess';

export function getOnboardingPipelineTitle(
  photoAccess: PhotoAccessState,
): string {
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
    return t('onboarding.pipelineDetecting');
  }

  const scanStarted =
    photoAccess.isScanning ||
    photoAccess.progress.batchCount > 0 ||
    photoAccess.progress.scannedCount > 0;
  if (scanStarted) {
    return t('onboarding.pipelineScanning');
  }

  if (!photoAccess.initialScanCompleted) {
    return t('onboarding.pipelineStarting');
  }

  if (photoAccess.petDetectionProgress.petCandidateCount === 0) {
    return t('onboarding.pipelineNoMoments');
  }

  return t('onboarding.pipelineMomentsFound');
}

export function getPetTypeStepTitle(petName: string): string {
  return t('onboarding.petTypeTitle', {
    name: petName.trim() || t('common.yourPet'),
  });
}

export function formatPetOptionPhotoCount(momentCount: number): string {
  return t('onboarding.petOptionPhotoCount', {
    count: momentCount.toLocaleString(),
    plural: pluralSuffix(momentCount),
  });
}
