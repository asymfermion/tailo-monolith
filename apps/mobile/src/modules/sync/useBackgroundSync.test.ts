import { getDatabase } from '@/db';
import { logTailo } from '@/lib/tailoLogger';

import { runCloudSyncPass } from './runCloudSyncPass';
import { runBackgroundCloudSyncPass } from './useBackgroundSync';

jest.mock('@/db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/lib/tailoLogger', () => ({
  logTailo: jest.fn(),
}));

jest.mock('./runCloudSyncPass', () => ({
  runCloudSyncPass: jest.fn(),
}));

describe('runBackgroundCloudSyncPass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs a cloud sync pass with the current database', async () => {
    const database = {};
    jest.mocked(getDatabase).mockResolvedValue(database as never);
    jest.mocked(runCloudSyncPass).mockResolvedValue({} as never);

    await runBackgroundCloudSyncPass();

    expect(runCloudSyncPass).toHaveBeenCalledWith(database);
    expect(logTailo).not.toHaveBeenCalled();
  });

  it('logs background sync failures without throwing', async () => {
    jest.mocked(getDatabase).mockRejectedValue(new Error('db closed'));

    await expect(runBackgroundCloudSyncPass()).resolves.toBeUndefined();

    expect(logTailo).toHaveBeenCalledWith(
      'Sync',
      'Background sync pass failed',
      {
        message: 'db closed',
      },
    );
  });
});
