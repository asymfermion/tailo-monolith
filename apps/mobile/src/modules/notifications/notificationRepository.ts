import type * as SQLite from 'expo-sqlite';
import type {
  NotificationDelivery,
  NotificationKind,
  NotificationPriority,
  NotificationRecord,
  RemoteNotificationUpdate,
  NotificationSource,
  NotificationTarget,
} from '@tailo/shared';
import {
  isNotificationDelivery,
  isNotificationKind,
  isNotificationPriority,
  isNotificationSource,
  isNotificationTarget,
} from '@tailo/shared';

type NotificationRow = {
  notificationId: string;
  kind: string;
  title: string;
  body: string;
  source: string;
  target: string;
  priority: string;
  delivery: string;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  remoteNotificationId: string | null;
  serverSyncVersion: number;
  pendingCloudSync: number;
  updatedAt: string;
};

export type NewNotificationInput = {
  notificationId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  source: NotificationSource;
  target: NotificationTarget;
  priority: NotificationPriority;
  delivery: NotificationDelivery;
  createdAt?: string;
  expiresAt?: string | null;
};

export async function insertNotification(
  db: SQLite.SQLiteDatabase,
  input: NewNotificationInput,
): Promise<boolean> {
  const result = await db.runAsync(
    `
      INSERT OR IGNORE INTO notifications (
        notification_id,
        kind,
        title,
        body,
        source,
        target,
        priority,
        delivery,
        created_at,
        expires_at,
        pending_cloud_sync,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, 1, CURRENT_TIMESTAMP
      )
    `,
    [
      input.notificationId,
      input.kind,
      input.title,
      input.body,
      input.source,
      JSON.stringify(input.target),
      input.priority,
      input.delivery,
      input.createdAt ?? null,
      input.expiresAt ?? null,
    ],
  );

  return result.changes > 0;
}

export async function listNotifications(
  db: SQLite.SQLiteDatabase,
  options?: {
    includeRead?: boolean;
    limit?: number;
  },
): Promise<NotificationRecord[]> {
  const includeRead = options?.includeRead ?? true;
  const limit = Math.max(1, Math.min(options?.limit ?? 100, 200));
  const readFilter = includeRead ? '' : 'AND read_at IS NULL';
  const rows = await db.getAllAsync<NotificationRow>(
    `
      SELECT
        notification_id AS notificationId,
        kind,
        title,
        body,
        source,
        target,
        priority,
        delivery,
        read_at AS readAt,
        created_at AS createdAt,
        expires_at AS expiresAt,
        remote_notification_id AS remoteNotificationId,
        server_sync_version AS serverSyncVersion,
        pending_cloud_sync AS pendingCloudSync,
        updated_at AS updatedAt
      FROM notifications
      WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ${readFilter}
      ORDER BY
        CASE WHEN read_at IS NULL THEN 0 ELSE 1 END ASC,
        datetime(created_at) DESC
      LIMIT ?
    `,
    [limit],
  );

  return rows
    .map((row) => mapNotificationRow(row))
    .filter((row): row is NotificationRecord => row !== null);
}

export async function getUnreadNotificationCount(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE read_at IS NULL
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
  );

  return Number(row?.count ?? 0);
}

export async function markUnreadNotificationsReadByKinds(
  db: SQLite.SQLiteDatabase,
  kinds: NotificationKind[],
  readAtIso?: string,
): Promise<number> {
  if (kinds.length === 0) {
    return 0;
  }

  const placeholders = kinds.map(() => '?').join(', ');
  const result = await db.runAsync(
    `
      UPDATE notifications
      SET
        read_at = COALESCE(read_at, COALESCE(?, CURRENT_TIMESTAMP)),
        pending_cloud_sync = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE read_at IS NULL
        AND kind IN (${placeholders})
    `,
    [readAtIso ?? null, ...kinds],
  );

  return result.changes;
}

export async function markNotificationRead(
  db: SQLite.SQLiteDatabase,
  notificationId: string,
  readAtIso?: string,
): Promise<boolean> {
  const result = await db.runAsync(
    `
      UPDATE notifications
      SET
        read_at = COALESCE(read_at, COALESCE(?, CURRENT_TIMESTAMP)),
        pending_cloud_sync = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE notification_id = ?
    `,
    [readAtIso ?? null, notificationId],
  );

  return result.changes > 0;
}

export async function hasRecentUnreadNotification(
  db: SQLite.SQLiteDatabase,
  options: {
    kind: NotificationKind;
    source: NotificationSource;
    target: NotificationTarget;
    withinSeconds: number;
  },
): Promise<boolean> {
  const seconds = Math.max(1, Math.floor(options.withinSeconds));
  const row = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE kind = ?
        AND source = ?
        AND target = ?
        AND read_at IS NULL
        AND datetime(created_at) >= datetime('now', ?)
    `,
    [
      options.kind,
      options.source,
      JSON.stringify(options.target),
      `-${seconds} seconds`,
    ],
  );

  return Number(row?.count ?? 0) > 0;
}

export type LocalNotificationSyncRow = {
  notificationId: string;
  remoteNotificationId: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  source: NotificationSource;
  target: NotificationTarget;
  priority: NotificationPriority;
  delivery: NotificationDelivery;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  serverSyncVersion: number;
  updatedAt: string;
};

export async function listNotificationsPendingCloudSync(
  db: SQLite.SQLiteDatabase,
  limit = 50,
): Promise<LocalNotificationSyncRow[]> {
  const rows = await db.getAllAsync<NotificationRow>(
    `
      SELECT
        notification_id AS notificationId,
        kind,
        title,
        body,
        source,
        target,
        priority,
        delivery,
        read_at AS readAt,
        created_at AS createdAt,
        expires_at AS expiresAt,
        remote_notification_id AS remoteNotificationId,
        server_sync_version AS serverSyncVersion,
        pending_cloud_sync AS pendingCloudSync,
        updated_at AS updatedAt
      FROM notifications
      WHERE pending_cloud_sync = 1
      ORDER BY datetime(updated_at) ASC
      LIMIT ?
    `,
    [limit],
  );

  return rows
    .map((row) => mapNotificationSyncRow(row))
    .filter((row): row is LocalNotificationSyncRow => row !== null);
}

export async function markNotificationCloudSynced(
  db: SQLite.SQLiteDatabase,
  notificationId: string,
  values: {
    remoteNotificationId: string;
    serverSyncVersion: number;
    readAt: string | null;
    updatedAt: string;
  },
): Promise<void> {
  await db.runAsync(
    `
      UPDATE notifications
      SET
        remote_notification_id = ?,
        server_sync_version = ?,
        read_at = ?,
        pending_cloud_sync = 0,
        updated_at = ?
      WHERE notification_id = ?
    `,
    [
      values.remoteNotificationId,
      values.serverSyncVersion,
      values.readAt,
      values.updatedAt,
      notificationId,
    ],
  );
}

export async function upsertNotificationFromCloud(
  db: SQLite.SQLiteDatabase,
  update: RemoteNotificationUpdate,
  resolveReadAt: (
    localReadAt: string | null,
    remoteReadAt: string | null,
  ) => string | null,
): Promise<{ changed: boolean; shouldSyncBack: boolean }> {
  const existing = await db.getFirstAsync<NotificationRow>(
    `
      SELECT
        notification_id AS notificationId,
        kind,
        title,
        body,
        source,
        target,
        priority,
        delivery,
        read_at AS readAt,
        created_at AS createdAt,
        expires_at AS expiresAt,
        remote_notification_id AS remoteNotificationId,
        server_sync_version AS serverSyncVersion,
        pending_cloud_sync AS pendingCloudSync,
        updated_at AS updatedAt
      FROM notifications
      WHERE notification_id = ?
      LIMIT 1
    `,
    [update.source_notification_id],
  );

  const mergedReadAt = resolveReadAt(existing?.readAt ?? null, update.read_at);
  const shouldSyncBack = mergedReadAt !== update.read_at;

  if (!existing) {
    await db.runAsync(
      `
        INSERT INTO notifications (
          notification_id,
          kind,
          title,
          body,
          source,
          target,
          priority,
          delivery,
          read_at,
          created_at,
          expires_at,
          remote_notification_id,
          server_sync_version,
          pending_cloud_sync,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        update.source_notification_id,
        update.kind,
        update.title,
        update.body,
        update.source,
        JSON.stringify(update.target),
        update.priority,
        update.delivery,
        mergedReadAt,
        update.created_at,
        update.expires_at,
        update.notification_id,
        update.sync_version,
        shouldSyncBack ? 1 : 0,
        update.updated_at,
      ],
    );

    return { changed: true, shouldSyncBack };
  }

  if (existing.serverSyncVersion > update.sync_version && !shouldSyncBack) {
    return { changed: false, shouldSyncBack: false };
  }

  await db.runAsync(
    `
      UPDATE notifications
      SET
        kind = ?,
        title = ?,
        body = ?,
        source = ?,
        target = ?,
        priority = ?,
        delivery = ?,
        read_at = ?,
        created_at = ?,
        expires_at = ?,
        remote_notification_id = ?,
        server_sync_version = ?,
        pending_cloud_sync = CASE WHEN ? = 1 THEN 1 ELSE 0 END,
        updated_at = ?
      WHERE notification_id = ?
    `,
    [
      update.kind,
      update.title,
      update.body,
      update.source,
      JSON.stringify(update.target),
      update.priority,
      update.delivery,
      mergedReadAt,
      update.created_at,
      update.expires_at,
      update.notification_id,
      update.sync_version,
      shouldSyncBack ? 1 : 0,
      update.updated_at,
      update.source_notification_id,
    ],
  );

  return { changed: true, shouldSyncBack };
}

function mapNotificationRow(row: NotificationRow): NotificationRecord | null {
  if (
    !isNotificationKind(row.kind) ||
    !isNotificationSource(row.source) ||
    !isNotificationPriority(row.priority) ||
    !isNotificationDelivery(row.delivery)
  ) {
    return null;
  }

  let target: unknown = null;
  try {
    target = JSON.parse(row.target);
  } catch {
    return null;
  }

  if (!isNotificationTarget(target)) {
    return null;
  }

  return {
    notification_id: row.notificationId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    source: row.source,
    target,
    priority: row.priority,
    delivery: row.delivery,
    read_at: row.readAt,
    created_at: row.createdAt,
    expires_at: row.expiresAt,
  };
}

function mapNotificationSyncRow(
  row: NotificationRow,
): LocalNotificationSyncRow | null {
  const base = mapNotificationRow(row);

  if (!base) {
    return null;
  }

  return {
    notificationId: base.notification_id,
    remoteNotificationId: row.remoteNotificationId,
    kind: base.kind,
    title: base.title,
    body: base.body,
    source: base.source,
    target: base.target,
    priority: base.priority,
    delivery: base.delivery,
    readAt: base.read_at,
    createdAt: base.created_at,
    expiresAt: base.expires_at,
    serverSyncVersion: row.serverSyncVersion,
    updatedAt: row.updatedAt,
  };
}
