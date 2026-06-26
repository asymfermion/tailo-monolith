import { getOnboardingPipelineTitle } from './onboarding';
import type { PhotoAccessState } from '@/modules/mediaScanner/usePhotoAccess';

const baseState: PhotoAccessState = {
  permissionStatus: 'full',
  canAskAgain: true,
  isScanning: false,
  isDetectingPets: false,
  isClusteringEvents: false,
  isSelectingImages: false,
  initialScanCompleted: false,
  progress: {
    batchCount: 0,
    scannedCount: 0,
    persistedCount: 0,
    hasNextPage: false,
  },
  petDetectionProgress: {
    batchCount: 0,
    processedCount: 0,
    totalCount: 0,
    petCandidateCount: 0,
    hasMore: false,
  },
  eventClusteringProgress: {
    petCandidateCount: 0,
    eventCandidateCount: 0,
    persistedCount: 0,
  },
  bestImageSelectionProgress: {
    eventCount: 0,
    scoredAssetCount: 0,
    selectedAssetCount: 0,
  },
  errorMessage: null,
};

describe('getOnboardingPipelineTitle', () => {
  it('stays in detecting title after processing started even if flags toggle', () => {
    const title = getOnboardingPipelineTitle({
      ...baseState,
      petDetectionProgress: {
        ...baseState.petDetectionProgress,
        processedCount: 12,
      },
    });

    expect(title).toBe('Finding pet moments');
  });

  it('shows scanning title before processing starts', () => {
    const title = getOnboardingPipelineTitle({
      ...baseState,
      progress: {
        ...baseState.progress,
        scannedCount: 50,
      },
    });

    expect(title).toBe('Looking through your photos');
  });
});
