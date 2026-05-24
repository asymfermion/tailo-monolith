import type * as SQLite from 'expo-sqlite';

import { waitForLocalPipelineIdle } from '@/db/localPipelineLock';
import { reconcilePromotedEventMediaForProfile } from '@/db/reconcilePromotedEventMedia';
import { getTimelineEvents } from '@/db/timelineEvents';
import { getSyncStateValue, SYNC_STATE_KEYS } from '@/db/syncState';
import { rebuildPipelineForProfilePetType } from '@/modules/eventBuilder/rebuildPipelineForProfilePetType';

import { loadTimelineForDisplay } from './loadTimelineForDisplay';

jest.mock('@/db/localPipelineLock', () => ({
  waitForLocalPipelineIdle: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/db/reconcilePromotedEventMedia', () => ({
  reconcilePromotedEventMediaForProfile: jest.fn().mockResolvedValue({
    removedScoreCount: 0,
    updatedEventCount: 0,
    removedEventCount: 0,
  }),
}));

jest.mock('@/db/timelineEvents', () => ({
  getTimelineEvents: jest.fn(),
}));

jest.mock('@/db/syncState', () => ({
  getSyncStateValue: jest.fn(),
  SYNC_STATE_KEYS: {
    PROFILE_PET_FILTER_APPLIED: 'pipeline.profile_pet_filter_applied',
  },
}));

jest.mock('@/modules/eventBuilder/rebuildPipelineForProfilePetType', () => ({
  rebuildPipelineForProfilePetType: jest.fn().mockResolvedValue({
    updatedAssetCount: 0,
  }),
}));

describe('loadTimelineForDisplay', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getTimelineEvents).mockResolvedValue([]);
    jest
      .mocked(getSyncStateValue)
      .mockResolvedValue(
        'dog' as Awaited<ReturnType<typeof getSyncStateValue>>,
      );
  });

  it('waits for the pipeline twice and reconciles media when the filter is already applied', async () => {
    await loadTimelineForDisplay(database, {
      profilePetType: 'dog',
      favoritesOnly: true,
    });

    expect(waitForLocalPipelineIdle).toHaveBeenCalledTimes(2);
    expect(reconcilePromotedEventMediaForProfile).toHaveBeenCalledWith(
      database,
      'dog',
    );
    expect(rebuildPipelineForProfilePetType).not.toHaveBeenCalled();
    expect(getTimelineEvents).toHaveBeenCalledWith(database, {
      favoritesOnly: true,
      profilePetType: 'dog',
    });
  });

  it('rebuilds the pipeline when the profile filter has not been applied yet', async () => {
    jest.mocked(getSyncStateValue).mockResolvedValue(null);

    await loadTimelineForDisplay(database, { profilePetType: 'cat' });

    expect(rebuildPipelineForProfilePetType).toHaveBeenCalledWith(
      database,
      'cat',
    );
    expect(reconcilePromotedEventMediaForProfile).not.toHaveBeenCalled();
    expect(getSyncStateValue).toHaveBeenCalledWith(
      database,
      SYNC_STATE_KEYS.PROFILE_PET_FILTER_APPLIED,
    );
  });
});
