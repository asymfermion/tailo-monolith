import { clearScanSyncState, setPipelinePhase } from '@/db/syncState';

import {
  getQualifiedOnboardingMomentMaxByPetType,
  getPromotedMomentCount,
} from './onboardingScanPolicy';
import { runOnboardingLocalPipeline } from './runOnboardingLocalPipeline';
import { runPipelineProcessingStages } from './runLocalPipeline';
import { scanRecentPhotos, type ScanProgress } from './scanner';

jest.mock('@/db/syncState', () => ({
  clearScanSyncState: jest.fn(),
  saveScanProgress: jest.fn(),
  setPipelinePhase: jest.fn(),
}));

jest.mock('./scanner', () => ({
  scanRecentPhotos: jest.fn(),
}));

jest.mock('./runLocalPipeline', () => ({
  runPipelineProcessingStages: jest.fn(),
}));

jest.mock('./onboardingScanPolicy', () => {
  const actual = jest.requireActual('./onboardingScanPolicy');
  return {
    ...actual,
    getQualifiedOnboardingMomentMaxByPetType: jest.fn(),
    getPromotedMomentCount: jest.fn(),
  };
});

const scanRecentPhotosMock = jest.mocked(scanRecentPhotos);
const runPipelineProcessingStagesMock = jest.mocked(
  runPipelineProcessingStages,
);
const getQualifiedOnboardingMomentMaxByPetTypeMock = jest.mocked(
  getQualifiedOnboardingMomentMaxByPetType,
);
const getPromotedMomentCountMock = jest.mocked(getPromotedMomentCount);

function makeScanProgress(overrides: Partial<ScanProgress> = {}): ScanProgress {
  return {
    batchCount: 1,
    scannedCount: 50,
    persistedCount: 50,
    hasNextPage: true,
    endCursor: 'cursor-1',
    ...overrides,
  };
}

describe('runOnboardingLocalPipeline', () => {
  const database = {} as Awaited<ReturnType<typeof import('@/db').getDatabase>>;

  beforeEach(() => {
    jest.clearAllMocks();
    scanRecentPhotosMock.mockReset();
    getQualifiedOnboardingMomentMaxByPetTypeMock.mockResolvedValue(0);
    getPromotedMomentCountMock.mockResolvedValue(0);
    runPipelineProcessingStagesMock.mockResolvedValue(undefined);
  });

  it('stops when the onboarding moment target is reached after processing', async () => {
    scanRecentPhotosMock
      .mockResolvedValueOnce(makeScanProgress())
      .mockResolvedValueOnce(makeScanProgress({ endCursor: 'cursor-2' }));
    getQualifiedOnboardingMomentMaxByPetTypeMock
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(10);
    getPromotedMomentCountMock.mockResolvedValue(10);

    const result = await runOnboardingLocalPipeline({
      database,
      limits: {
        windowDays: 90,
        maxImages: 300,
        targetMoments: 10,
      },
    });

    expect(result).toEqual({
      totalScannedImages: 50,
      promotedMomentCount: 10,
      stoppedBecause: 'moments',
    });
    expect(scanRecentPhotosMock).toHaveBeenCalledTimes(1);
    expect(runPipelineProcessingStagesMock).toHaveBeenCalledTimes(1);
    expect(clearScanSyncState).toHaveBeenCalledWith(database);
    expect(setPipelinePhase).toHaveBeenCalledWith(database, 'idle');
  });

  it('stops when the image cap is reached even if more pages remain', async () => {
    scanRecentPhotosMock.mockImplementation(async (options) => {
      const batchSize = Math.min(options.maxImages ?? 0, 50);
      return makeScanProgress({
        scannedCount: batchSize,
        persistedCount: batchSize,
        hasNextPage: true,
      });
    });

    const result = await runOnboardingLocalPipeline({
      database,
      limits: {
        windowDays: 90,
        maxImages: 150,
        targetMoments: 10,
      },
    });

    expect(result.stoppedBecause).toBe('images');
    expect(result.totalScannedImages).toBe(150);
    expect(scanRecentPhotosMock).toHaveBeenCalledTimes(3);
    expect(scanRecentPhotosMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ maxImages: 150, maxPages: 1 }),
    );
    expect(scanRecentPhotosMock.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({ maxImages: 50, maxPages: 1 }),
    );
  });

  it('stops when the 90-day window has no more pages', async () => {
    scanRecentPhotosMock.mockResolvedValue(
      makeScanProgress({ hasNextPage: false, scannedCount: 25 }),
    );

    const result = await runOnboardingLocalPipeline({
      database,
      limits: {
        windowDays: 90,
        maxImages: 300,
        targetMoments: 10,
      },
    });

    expect(result.stoppedBecause).toBe('window');
    expect(result.totalScannedImages).toBe(25);
  });

  it('stops immediately when the library returns no photos', async () => {
    scanRecentPhotosMock.mockResolvedValue(
      makeScanProgress({ scannedCount: 0, hasNextPage: false }),
    );

    const result = await runOnboardingLocalPipeline({
      database,
      limits: {
        windowDays: 90,
        maxImages: 300,
        targetMoments: 10,
      },
    });

    expect(result.stoppedBecause).toBe('empty');
    expect(runPipelineProcessingStagesMock).not.toHaveBeenCalled();
  });
});
