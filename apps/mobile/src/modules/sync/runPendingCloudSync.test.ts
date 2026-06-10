import { listLocalEventIdsPendingCloudSync } from '@/db/localEvents';
import { createSyncCompletionNotification } from '@/modules/notifications/notificationProducers';

import { runPendingCloudSync } from './runPendingCloudSync';
import { runEventSyncForLocalEvent } from './runEventSync';

jest.mock('@/db/localEvents', () => ({
  listLocalEventIdsPendingCloudSync: jest.fn(),
}));

jest.mock('./runEventSync', () => ({
  runEventSyncForLocalEvent: jest.fn(),
}));

jest.mock('@/modules/notifications/notificationProducers', () => ({
  createSyncCompletionNotification: jest.fn(),
}));

const mockedListPending =
  listLocalEventIdsPendingCloudSync as jest.MockedFunction<
    typeof listLocalEventIdsPendingCloudSync
  >;
const mockedSync = runEventSyncForLocalEvent as jest.MockedFunction<
  typeof runEventSyncForLocalEvent
>;
const mockedCreateSyncNotification =
  createSyncCompletionNotification as jest.MockedFunction<
    typeof createSyncCompletionNotification
  >;

describe('runPendingCloudSync', () => {
  const database = {} as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncs each moment marked pending_cloud_sync', async () => {
    mockedListPending.mockResolvedValue(['event-a', 'event-b']);
    mockedSync
      .mockResolvedValueOnce({ status: 'synced' })
      .mockResolvedValueOnce({ status: 'skipped' });

    await expect(runPendingCloudSync(database)).resolves.toEqual({
      attempted: 2,
      synced: 1,
      skipped: 1,
      errors: 0,
    });

    expect(mockedSync).toHaveBeenCalledTimes(2);
    expect(mockedCreateSyncNotification).toHaveBeenCalledWith({
      syncedCount: 1,
      errorCount: 0,
    });
  });

  it('returns zeros when nothing is pending', async () => {
    mockedListPending.mockResolvedValue([]);

    await expect(runPendingCloudSync(database)).resolves.toEqual({
      attempted: 0,
      synced: 0,
      skipped: 0,
      errors: 0,
    });
  });
});
