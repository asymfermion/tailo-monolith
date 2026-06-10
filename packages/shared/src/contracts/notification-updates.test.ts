import { describe, expect, it } from 'vitest';

import {
  decodeNotificationUpdateCursor,
  encodeNotificationUpdateCursor,
  isGetNotificationUpdatesResponse,
  isSyncNotificationsResponse,
  parseGetNotificationUpdatesRequest,
  parseSyncNotificationsRequest,
  parseSyncNotificationRequest,
} from './notification-updates.ts';

describe('notification updates contract', () => {
  it('parses sync notification request', () => {
    const parsed = parseSyncNotificationRequest({
      source_notification_id: 'notif-1',
      kind: 'sync_complete',
      title: 'Synced',
      body: 'All done',
      source: 'sync',
      target: { type: 'timeline' },
      priority: 'normal',
      delivery: 'in_app',
      read_at: null,
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.source_notification_id).toBe('notif-1');
  });

  it('parses get updates request', () => {
    const parsed = parseGetNotificationUpdatesRequest({
      cursor: 'abc',
      limit: 20,
    });

    expect(parsed).toEqual({
      cursor: 'abc',
      limit: 20,
    });
  });

  it('validates get updates response shape', () => {
    expect(
      isGetNotificationUpdatesResponse({
        notifications: [
          {
            notification_id: 'remote-1',
            source_notification_id: 'notif-1',
            kind: 'sync_complete',
            title: 'Synced',
            body: 'All done',
            source: 'sync',
            target: { type: 'timeline' },
            priority: 'normal',
            delivery: 'in_app',
            read_at: null,
            created_at: '2026-06-06T11:00:00.000Z',
            expires_at: null,
            sync_version: 1,
            updated_at: '2026-06-06T11:00:00.000Z',
          },
        ],
        next_cursor: null,
      }),
    ).toBe(true);
  });

  it('encodes and decodes cursor', () => {
    const encoded = encodeNotificationUpdateCursor({
      updatedAt: '2026-06-06T11:00:00.000Z',
      notificationId: 'remote-1',
    });
    const decoded = decodeNotificationUpdateCursor(encoded);

    expect(decoded).toEqual({
      updatedAt: '2026-06-06T11:00:00.000Z',
      notificationId: 'remote-1',
    });
  });

  it('parses combined sync request with upserts', () => {
    const parsed = parseSyncNotificationsRequest({
      cursor: 'c1',
      upserts: [
        {
          source_notification_id: 'notif-1',
          kind: 'sync_complete',
          title: 'Synced',
          body: 'All done',
          source: 'sync',
          target: { type: 'timeline' },
          priority: 'normal',
          delivery: 'in_app',
        },
      ],
    });

    expect(parsed).toEqual({
      cursor: 'c1',
      limit: undefined,
      upserts: [
        {
          source_notification_id: 'notif-1',
          kind: 'sync_complete',
          title: 'Synced',
          body: 'All done',
          source: 'sync',
          target: { type: 'timeline' },
          priority: 'normal',
          delivery: 'in_app',
          read_at: undefined,
          created_at: undefined,
          expires_at: undefined,
        },
      ],
    });
  });

  it('validates combined sync response shape', () => {
    expect(
      isSyncNotificationsResponse({
        synced: [
          {
            notification_id: 'remote-1',
            source_notification_id: 'notif-1',
            sync_version: 2,
            read_at: null,
            updated_at: '2026-06-06T11:02:00.000Z',
          },
        ],
        notifications: [],
        next_cursor: null,
      }),
    ).toBe(true);
  });
});
