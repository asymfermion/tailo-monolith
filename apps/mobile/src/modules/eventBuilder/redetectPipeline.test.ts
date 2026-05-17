import type * as SQLite from 'expo-sqlite';

import { clearLocalEventPipeline } from '@/db/localEventCandidates';
import { resetLocalAssetsForRedetection } from '@/db/localAssets';

import { processPendingPetCandidates } from './petDetection';
import { redetectLocalPetPipeline } from './redetectPipeline';

jest.mock('@/db/localEventCandidates', () => ({
  clearLocalEventPipeline: jest.fn(),
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
    jest.mocked(resetLocalAssetsForRedetection).mockResolvedValue(3);
    jest.mocked(processPendingPetCandidates).mockResolvedValue({
      batchCount: 1,
      processedCount: 3,
      totalCount: 3,
      petCandidateCount: 2,
      hasMore: false,
    });
  });

  it('resets assets, clears events, and reruns detection', async () => {
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
    });

    expect(resetLocalAssetsForRedetection).toHaveBeenCalledWith(database);
    expect(clearLocalEventPipeline).toHaveBeenCalledWith(database);
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

    expect(clearLocalEventPipeline).not.toHaveBeenCalled();
    expect(processPendingPetCandidates).not.toHaveBeenCalled();
  });
});
