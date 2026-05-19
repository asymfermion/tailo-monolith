import type * as SQLite from 'expo-sqlite';

import { getLocalAssetDetectionInputsForPromotedEvents } from '@/db/localAssets';
import { reconcilePromotedEventMediaForProfile } from '@/db/reconcilePromotedEventMedia';
import { pruneLocalTimelineForProfilePetType } from '@/db/localEvents';

import { redetectLocalAssets } from './petDetection';
import { revalidatePromotedEventPetMedia } from './revalidatePromotedEventPetMedia';

jest.mock('@/db/localAssets', () => ({
  getLocalAssetDetectionInputsForPromotedEvents: jest.fn(),
}));

jest.mock('./petDetection', () => ({
  redetectLocalAssets: jest.fn(),
}));

jest.mock('@/db/reconcilePromotedEventMedia', () => ({
  reconcilePromotedEventMediaForProfile: jest.fn(),
}));

jest.mock('@/db/localEvents', () => ({
  pruneLocalTimelineForProfilePetType: jest.fn(),
}));

describe('revalidatePromotedEventPetMedia', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when there are no promoted event photos', async () => {
    jest
      .mocked(getLocalAssetDetectionInputsForPromotedEvents)
      .mockResolvedValue([]);

    await expect(
      revalidatePromotedEventPetMedia({
        database,
        profilePetType: 'dog',
      }),
    ).resolves.toBeNull();
  });

  it('redetects, reconciles, and prunes promoted events', async () => {
    jest
      .mocked(getLocalAssetDetectionInputsForPromotedEvents)
      .mockResolvedValue([
        {
          localAssetId: 'a1',
          uri: 'file:///a1.jpg',
          createdAt: '2026-05-19T12:00:00.000Z',
          width: 100,
          height: 100,
        },
      ]);
    jest.mocked(redetectLocalAssets).mockResolvedValue({
      redetectedCount: 1,
      validForProfileCount: 1,
    });
    jest.mocked(reconcilePromotedEventMediaForProfile).mockResolvedValue({
      removedScoreCount: 0,
      updatedEventCount: 0,
      removedEventCount: 0,
    });
    jest.mocked(pruneLocalTimelineForProfilePetType).mockResolvedValue({
      removedEventCount: 0,
      removedScoreCount: 0,
    });

    await expect(
      revalidatePromotedEventPetMedia({
        database,
        profilePetType: 'dog',
      }),
    ).resolves.toEqual({
      redetectedCount: 1,
      validForProfileCount: 1,
      reconcile: {
        removedScoreCount: 0,
        updatedEventCount: 0,
        removedEventCount: 0,
      },
      prune: {
        removedEventCount: 0,
        removedScoreCount: 0,
      },
    });

    expect(redetectLocalAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        profilePetType: 'dog',
      }),
    );
  });
});
