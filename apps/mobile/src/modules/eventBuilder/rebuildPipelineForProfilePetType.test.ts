import type * as SQLite from 'expo-sqlite';

import { clearLocalEventPipeline } from '@/db/localEventCandidates';
import { pruneLocalTimelineForProfilePetType } from '@/db/localEvents';
import { reapplyPetCandidateFlagsForProfile } from '@/db/localAssets';
import { setSyncStateValue } from '@/db/syncState';

import { clusterLocalPetEvents } from './eventClustering';
import { promoteScoredCandidatesToLocalEvents } from './eventPromotion';
import { selectBestEventImages } from './bestImageSelection';
import { rebuildPipelineForProfilePetType } from './rebuildPipelineForProfilePetType';

jest.mock('@/db/localAssets', () => ({
  reapplyPetCandidateFlagsForProfile: jest.fn(),
}));

jest.mock('@/db/localEventCandidates', () => ({
  clearLocalEventPipeline: jest.fn(),
}));

jest.mock('@/db/localEvents', () => ({
  pruneLocalTimelineForProfilePetType: jest.fn(),
}));

jest.mock('./eventClustering', () => ({
  clusterLocalPetEvents: jest.fn(),
}));

jest.mock('./bestImageSelection', () => ({
  selectBestEventImages: jest.fn(),
}));

jest.mock('./eventPromotion', () => ({
  promoteScoredCandidatesToLocalEvents: jest.fn(),
}));

jest.mock('@/db/syncState', () => ({
  SYNC_STATE_KEYS: {
    PROFILE_PET_FILTER_APPLIED: 'pipeline.profile_pet_filter_applied',
  },
  setSyncStateValue: jest.fn(),
}));

describe('rebuildPipelineForProfilePetType', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(reapplyPetCandidateFlagsForProfile).mockResolvedValue(4);
    jest.mocked(clearLocalEventPipeline).mockResolvedValue(undefined);
    jest.mocked(pruneLocalTimelineForProfilePetType).mockResolvedValue({
      removedEventCount: 0,
      removedScoreCount: 0,
    });
    jest.mocked(clusterLocalPetEvents).mockResolvedValue({
      petCandidateCount: 2,
      eventCandidateCount: 1,
      persistedCount: 1,
    });
    jest.mocked(selectBestEventImages).mockResolvedValue({
      eventCount: 1,
      scoredAssetCount: 2,
      selectedAssetCount: 2,
    });
    jest.mocked(promoteScoredCandidatesToLocalEvents).mockResolvedValue({
      candidateCount: 1,
      promotedCount: 1,
    });
  });

  it('reapplies pet flags and rebuilds the local event pipeline', async () => {
    await expect(
      rebuildPipelineForProfilePetType(database, 'dog'),
    ).resolves.toEqual({ updatedAssetCount: 4 });

    expect(reapplyPetCandidateFlagsForProfile).toHaveBeenCalledWith(
      database,
      'dog',
    );
    expect(clearLocalEventPipeline).toHaveBeenCalledWith(database);
    expect(clusterLocalPetEvents).toHaveBeenCalledWith({
      database,
      profilePetType: 'dog',
    });
    expect(selectBestEventImages).toHaveBeenCalledWith({ database });
    expect(promoteScoredCandidatesToLocalEvents).toHaveBeenCalledWith({
      database,
    });
    expect(pruneLocalTimelineForProfilePetType).toHaveBeenCalledWith(
      database,
      'dog',
    );
    expect(setSyncStateValue).toHaveBeenCalledWith(
      database,
      'pipeline.profile_pet_filter_applied',
      'dog',
    );
  });
});
