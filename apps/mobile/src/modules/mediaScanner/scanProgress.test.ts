import {
  computeOnboardingScanProgress,
  getScanProgressDetail,
  getScanPipelineSteps,
} from './scanProgress';
import type { PhotoAccessState } from './usePhotoAccess';

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

describe('computeOnboardingScanProgress', () => {
  it('returns higher progress while detecting pets', () => {
    const scanning = computeOnboardingScanProgress({
      ...baseState,
      isScanning: true,
      progress: { ...baseState.progress, scannedCount: 100 },
    });
    const detecting = computeOnboardingScanProgress({
      ...baseState,
      isDetectingPets: true,
      petDetectionProgress: {
        ...baseState.petDetectionProgress,
        processedCount: 50,
        totalCount: 100,
      },
    });

    expect(detecting).toBeGreaterThan(scanning);
  });

  it('returns 1 when the initial scan is complete', () => {
    expect(
      computeOnboardingScanProgress({
        ...baseState,
        initialScanCompleted: true,
      }),
    ).toBe(1);
  });
});

describe('getScanPipelineSteps', () => {
  it('marks the active step while scanning', () => {
    const steps = getScanPipelineSteps({
      ...baseState,
      isScanning: true,
    });

    expect(steps.find((step) => step.id === 'scan')?.status).toBe('active');
    expect(steps.find((step) => step.id === 'detect')?.status).toBe('pending');
  });

  it('keeps best picks pending until initial scan is complete', () => {
    const beforeComplete = getScanPipelineSteps(baseState);
    const afterComplete = getScanPipelineSteps({
      ...baseState,
      initialScanCompleted: true,
    });

    expect(beforeComplete.find((step) => step.id === 'select')?.status).toBe(
      'pending',
    );
    expect(afterComplete.find((step) => step.id === 'select')?.status).toBe(
      'complete',
    );
  });
});

describe('getScanProgressDetail', () => {
  it('shows detection counts while detecting', () => {
    expect(
      getScanProgressDetail({
        ...baseState,
        isDetectingPets: true,
        petDetectionProgress: {
          ...baseState.petDetectionProgress,
          processedCount: 12,
          totalCount: 40,
        },
      }),
    ).toContain('12 of 40');
  });
});
