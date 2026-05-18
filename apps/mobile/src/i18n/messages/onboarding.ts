import { pluralSuffix, t } from '../t';
import type { PhotoAccessState } from '@/modules/mediaScanner/usePhotoAccess';

export function getOnboardingPipelineTitle(
  photoAccess: PhotoAccessState,
): string {
  if (photoAccess.isScanning) {
    return t('onboarding.pipelineScanning');
  }

  if (photoAccess.isDetectingPets) {
    return t('onboarding.pipelineDetecting');
  }

  if (photoAccess.isClusteringEvents) {
    return t('onboarding.pipelineClustering');
  }

  if (photoAccess.isSelectingImages) {
    return t('onboarding.pipelineSelecting');
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
