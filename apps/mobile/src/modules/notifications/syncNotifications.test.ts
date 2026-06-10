import type * as SQLite from 'expo-sqlite';

import { getSyncStateValue, setSyncStateValue } from '@/db/syncState';
import { getAuthSession, isRemoteAuthConfigured } from '@/modules/auth/authService';

import { syncNotifications } from './api';
import {
  listNotificationsPendingCloudSync,
  markNotificationCloudSynced,
  upsertNotificationFromCloud,
} from './notificationRepository';
import { runNotificationSyncPass } from './syncNotifications';

jest.mock('@/db/syncState', () => ({
  getSyncStateValue: jest.fn(),
  setSyncStateValue: jest.fn(),
  SYNC_STATE_KEYS: {
    NOTIFICATIONS_CURSOR: 'sync.notifications_cursor',
  },
}));

jest.mock('@/modules/auth/authService', () => ({
  getAuthSession: jest.fn(),
  isRemoteAuthConfigured: jest.fn(),
}));

jest.mock('./api', () => ({
  syncNotifications: jest.fn(),
}));

jest.mock('./notificationRepository', () => ({
  listNotificationsPendingCloudSync: jest.fn(),
  markNotificationCloudSynced: jest.fn(),
  upsertNotificationFromCloud: jest.fn(),
}));

describe('runNotificationSyncPass', () => {
  const db = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      accessToken: 'token',
    } as never);
    jest.mocked(getSyncStateValue).mockResolvedValue(null);
    jest.mocked(listNotificationsPendingCloudSync).mockResolvedValue([]);
    jest.mocked(syncNotifications).mockResolvedValue({
      status: 'success',
      response: { synced: [], notifications: [], next_cursor: null },
    });
    jest.mocked(upsertNotificationFromCloud).mockResolvedValue({
      changed: false,
      shouldSyncBack: false,
    });
  });

  it('pushes pending notifications and marks them synced', async () => {
    jest.mocked(listNotificationsPendingCloudSync).mockResolvedValue([
      {
        notificationId: 'notif-1',
        remoteNotificationId: null,
        kind: 'sync_complete',
        title: 'Synced',
        body: 'Done',
        source: 'sync',
        target: { type: 'timeline' },
        priority: 'normal',
        delivery: 'in_app',
        readAt: null,
        createdAt: '2026-06-06T11:00:00.000Z',
        expiresAt: null,
        serverSyncVersion: 0,
        updatedAt: '2026-06-06T11:00:00.000Z',
      },
    ]);
    jest.mocked(syncNotifications).mockResolvedValue({
      status: 'success',
      response: {
        synced: [
          {
            notification_id: 'remote-1',
            source_notification_id: 'notif-1',
            sync_version: 1,
            read_at: null,
            updated_at: '2026-06-06T11:00:01.000Z',
          },
        ],
        notifications: [],
        next_cursor: null,
      },
    });

    const result = await runNotificationSyncPass(db);

    expect(result.pushed).toBe(1);
    expect(markNotificationCloudSynced).toHaveBeenCalledWith(db, 'notif-1', {
      remoteNotificationId: 'remote-1',
      serverSyncVersion: 1,
      readAt: null,
      updatedAt: '2026-06-06T11:00:01.000Z',
    });
  });

  it('pulls remote updates and saves cursor', async () => {
    jest.mocked(syncNotifications).mockResolvedValue({
      status: 'success',
      response: {
        synced: [],
        notifications: [
          {
            notification_id: 'remote-2',
            source_notification_id: 'notif-2',
            kind: 'ai_job_complete',
            title: 'Updated',
            body: 'Caption ready',
            source: 'cloud_job',
            target: { type: 'event_detail', local_event_id: 'event-1' },
            priority: 'normal',
            delivery: 'in_app',
            read_at: null,
            created_at: '2026-06-06T11:00:00.000Z',
            expires_at: null,
            sync_version: 2,
            updated_at: '2026-06-06T11:01:00.000Z',
          },
        ],
        next_cursor: 'cursor-2',
      },
    });
    jest.mocked(upsertNotificationFromCloud).mockResolvedValue({
      changed: true,
      shouldSyncBack: false,
    });

    const result = await runNotificationSyncPass(db);

    expect(result.pulled).toBe(1);
    expect(setSyncStateValue).toHaveBeenCalledWith(
      db,
      'sync.notifications_cursor',
      'cursor-2',
    );
  });
});
