import type * as SQLite from 'expo-sqlite';

import { resetLocalAssetsForRedetection } from '@/db/localAssets';
import { recordUserTimelineWipe } from '@/modules/sync/userTimelineWipe';

import { processPendingPetCandidates } from './petDetection';
import { redetectLocalPetPipeline } from './redetectPipeline';

jest.mock('@/modules/sync/userTimelineWipe', () => ({
  recordUserTimelineWipe: jest.fn(),
}));

jest.mock('@/db/localAssets', () => ({
  resetLocalAssetsForRedetection: jest.fn(),
}));

jest.mock('./petDetection', () => ({
  processPendingPetCandidates: jest.fn(),
}));

describe('redetectLocalPetPipeline', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(recordUserTimelineWipe).mockResolvedValue({
      timelineGeneration: 2,
      tombstonedCount: 1,
      clearedUploadQueue: true,
    });
    jest.mocked(resetLocalAssetsForRedetection).mockResolvedValue(3);
    jest.mocked(processPendingPetCandidates).mockResolvedValue({
      batchCount: 1,
      processedCount: 3,
      totalCount: 3,
      petCandidateCount: 2,
      hasMore: false,
    });
  });

  it('wipes timeline for user, resets assets, and reruns detection', async () => {
    const onDetectingProgress = jest.fn();

    await expect(
      redetectLocalPetPipeline({
        database,
        onDetectingProgress,
      }),
    ).resolves.toEqual({
      resetAssetCount: 3,
      petDetectionProgress: {
        batchCount: 1,
        processedCount: 3,
        totalCount: 3,
        petCandidateCount: 2,
        hasMore: false,
      },
      wipe: {
        timelineGeneration: 2,
        tombstonedCount: 1,
        clearedUploadQueue: true,
      },
    });

    expect(recordUserTimelineWipe).toHaveBeenCalledWith(database);
    expect(resetLocalAssetsForRedetection).toHaveBeenCalledWith(database);
    expect(processPendingPetCandidates).toHaveBeenCalledWith({
      database,
      onProgress: onDetectingProgress,
    });
  });

  it('fails when there are no saved photos to redetect', async () => {
    jest.mocked(resetLocalAssetsForRedetection).mockResolvedValue(0);

    await expect(redetectLocalPetPipeline({ database })).rejects.toThrow(
      'No saved photos to redetect yet.',
    );

    expect(recordUserTimelineWipe).toHaveBeenCalledWith(database);
    expect(processPendingPetCandidates).not.toHaveBeenCalled();
  });
});
