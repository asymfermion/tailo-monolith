import type * as SQLite from 'expo-sqlite';

import {
  getUnreadNotificationCount,
  hasRecentUnreadNotification,
  insertNotification,
  listNotifications,
  markNotificationRead,
  markUnreadNotificationsReadByKinds,
} from './notificationRepository';

type StoredNotification = {
  notification_id: string;
  kind: string;
  title: string;
  body: string;
  source: string;
  target: string;
  priority: string;
  delivery: string;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
};

function createFakeDb() {
  const rows: StoredNotification[] = [];

  const db = {
    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('INSERT OR IGNORE INTO notifications')) {
        const id = String(params[0]);
        if (rows.some((row) => row.notification_id === id)) {
          return { changes: 0 };
        }

        rows.push({
          notification_id: id,
          kind: String(params[1]),
          title: String(params[2]),
          body: String(params[3]),
          source: String(params[4]),
          target: String(params[5]),
          priority: String(params[6]),
          delivery: String(params[7]),
          created_at:
            typeof params[8] === 'string'
              ? String(params[8])
              : new Date().toISOString(),
          expires_at:
            params[9] === null || params[9] === undefined
              ? null
              : String(params[9]),
          read_at: null,
        });
        return { changes: 1 };
      }

      if (sql.includes('UPDATE notifications')) {
        const readAt =
          typeof params[0] === 'string'
            ? String(params[0])
            : new Date().toISOString();

        if (sql.includes('kind IN')) {
          const kinds = params.slice(1).map((kind) => String(kind));
          let changes = 0;

          for (const row of rows) {
            if (row.read_at || !kinds.includes(row.kind)) {
              continue;
            }

            row.read_at = readAt;
            changes += 1;
          }

          return { changes };
        }

        const id = String(params[1]);
        const row = rows.find((item) => item.notification_id === id);
        if (!row) {
          return { changes: 0 };
        }
        if (!row.read_at) {
          row.read_at = readAt;
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      return { changes: 0 };
    }),
    getAllAsync: jest.fn(async () => {
      const sorted = [...rows].sort((a, b) => {
        if (a.read_at && !b.read_at) {
          return 1;
        }
        if (!a.read_at && b.read_at) {
          return -1;
        }
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      });

      return sorted.map((row) => ({
        notificationId: row.notification_id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        source: row.source,
        target: row.target,
        priority: row.priority,
        delivery: row.delivery,
        readAt: row.read_at,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
    }),
    getFirstAsync: jest.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('COUNT(*) AS count') && sql.includes('read_at IS NULL')) {
        if (sql.includes('kind = ?')) {
          const [kind, source, target] = params;
          const count = rows.filter(
            (row) =>
              row.kind === kind &&
              row.source === source &&
              row.target === target &&
              row.read_at === null,
          ).length;
          return { count };
        }

        return { count: rows.filter((row) => row.read_at === null).length };
      }

      return { count: 0 };
    }),
  } as unknown as SQLite.SQLiteDatabase;

  return { db, rows };
}

describe('notificationRepository', () => {
  it('creates notifications and reports unread count', async () => {
    const { db } = createFakeDb();

    await insertNotification(db, {
      notificationId: 'notif-a',
      kind: 'account_reminder',
      title: 'Save your memories',
      body: 'Connect your account.',
      source: 'account',
      target: { type: 'account_settings', mode: 'link' },
      priority: 'normal',
      delivery: 'in_app',
    });

    await expect(getUnreadNotificationCount(db)).resolves.toBe(1);
  });

  it('marks notifications read when opened', async () => {
    const { db } = createFakeDb();

    await insertNotification(db, {
      notificationId: 'notif-b',
      kind: 'sync_complete',
      title: 'Synced',
      body: 'Moments synced.',
      source: 'sync',
      target: { type: 'timeline' },
      priority: 'normal',
      delivery: 'in_app',
    });

    await markNotificationRead(db, 'notif-b');
    await expect(getUnreadNotificationCount(db)).resolves.toBe(0);
  });

  it('marks unread notifications read by kind', async () => {
    const { db } = createFakeDb();

    await insertNotification(db, {
      notificationId: 'notif-upgrade-a',
      kind: 'account_reminder',
      title: 'Save your memories',
      body: 'Connect your account.',
      source: 'account',
      target: { type: 'account_settings', mode: 'link' },
      priority: 'normal',
      delivery: 'in_app',
    });
    await insertNotification(db, {
      notificationId: 'notif-upgrade-b',
      kind: 'continuity_risk',
      title: 'Protect this timeline',
      body: 'Connect an account.',
      source: 'local_app',
      target: { type: 'account_settings', mode: 'link' },
      priority: 'high',
      delivery: 'in_app',
    });
    await insertNotification(db, {
      notificationId: 'notif-sync',
      kind: 'sync_complete',
      title: 'Synced',
      body: 'Moments synced.',
      source: 'sync',
      target: { type: 'timeline' },
      priority: 'normal',
      delivery: 'in_app',
    });

    await expect(
      markUnreadNotificationsReadByKinds(db, [
        'account_reminder',
        'continuity_risk',
      ]),
    ).resolves.toBe(2);
    await expect(getUnreadNotificationCount(db)).resolves.toBe(1);
  });

  it('checks recent unread dedupe by kind/source/target', async () => {
    const { db } = createFakeDb();

    await insertNotification(db, {
      notificationId: 'notif-c',
      kind: 'continuity_risk',
      title: 'Protect timeline',
      body: 'Connect an account.',
      source: 'local_app',
      target: { type: 'account_settings', mode: 'link' },
      priority: 'high',
      delivery: 'in_app',
    });

    await expect(
      hasRecentUnreadNotification(db, {
        kind: 'continuity_risk',
        source: 'local_app',
        target: { type: 'account_settings', mode: 'link' },
        withinSeconds: 60,
      }),
    ).resolves.toBe(true);

    const notifications = await listNotifications(db, { includeRead: true });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.notification_id).toBe('notif-c');
  });
});
