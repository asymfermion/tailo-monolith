import type * as SQLite from 'expo-sqlite';

import { getProfilePhotoSuggestion } from './profilePhotoSuggestion';

describe('getProfilePhotoSuggestion', () => {
  it('returns the highest scoring local media suggestion', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({
      localAssetId: 'asset-1',
      uri: 'ph://asset-1',
      width: 1080,
      height: 1080,
      overallScore: 0.92,
    });
    const db = { getFirstAsync } as unknown as SQLite.SQLiteDatabase;

    await expect(getProfilePhotoSuggestion(db)).resolves.toEqual({
      localAssetId: 'asset-1',
      uri: 'ph://asset-1',
      width: 1080,
      height: 1080,
      overallScore: 0.92,
    });
    expect(getFirstAsync).toHaveBeenCalledWith(expect.any(String));
    expect(getFirstAsync.mock.calls[0]?.[0]).toContain(
      'ORDER BY scores.is_primary DESC, scores.overall_score DESC',
    );
  });
});
