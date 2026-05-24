import { getDatabase } from '@/db';
import { updateLocalEvent } from '@/db/localEvents';

import { scheduleCloudSyncForMoment } from './scheduleCloudSyncForMoment';
import { toggleMomentFavorite } from './toggleMomentFavorite';

jest.mock('@/db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/db/localEvents', () => ({
  updateLocalEvent: jest.fn(),
}));

jest.mock('./scheduleCloudSyncForMoment', () => ({
  scheduleCloudSyncForMoment: jest.fn(),
}));

describe('toggleMomentFavorite', () => {
  it('updates favorite state in local storage', async () => {
    const database = { id: 'db' };
    jest.mocked(getDatabase).mockResolvedValue(database as never);
    jest.mocked(updateLocalEvent).mockResolvedValue(true);

    await expect(toggleMomentFavorite('local-event-1', true)).resolves.toBe(
      true,
    );

    expect(updateLocalEvent).toHaveBeenCalledWith(database, 'local-event-1', {
      isFavorite: true,
    });
    expect(scheduleCloudSyncForMoment).toHaveBeenCalledWith('local-event-1');
  });
});
