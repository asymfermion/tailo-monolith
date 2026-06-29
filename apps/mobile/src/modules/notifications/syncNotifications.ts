import type * as SQLite from 'expo-sqlite';

import {
  getSyncStateValue,
  setSyncStateValue,
  SYNC_STATE_KEYS,
} from '@/db/syncState';
import { logTailo } from '@/lib/tailoLogger';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';

import { syncNotifications } from './api';
import {
  listNotificationsPendingCloudSync,
  markNotificationCloudSynced,
  upsertNotificationFromCloud,
} from './notificationRepository';
import { emitNotificationChange } from './notificationStore';
import { resolveNotificationReadAt } from './readStateReconciliation';

export type RunNotificationSyncPassResult = {
  pushed: number;
  pulled: number;
  errors: number;
  skippedReason: string | null;
};

const NOTIFICATIONS_CURSOR_KEY = SYNC_STATE_KEYS.NOTIFICATIONS_CURSOR;

export async function runNotificationSyncPass(
  db: SQLite.SQLiteDatabase,
): Promise<RunNotificationSyncPassResult> {
  if (!isRemoteAuthConfigured()) {
    return {
      pushed: 0,
      pulled: 0,
      errors: 0,
      skippedReason: 'remote_auth_unconfigured',
    };
  }

  const session = await getAuthSession();
  if (!session) {
    return {
      pushed: 0,
      pulled: 0,
      errors: 0,
      skippedReason: 'missing_session',
    };
  }

  let pushed = 0;
  let pulled = 0;
  let errors = 0;
  let changed = false;

  const pending = await listNotificationsPendingCloudSync(db);
  const cursorRaw = await getSyncStateValue(db, NOTIFICATIONS_CURSOR_KEY);
  const cursor = cursorRaw && cursorRaw.length > 0 ? cursorRaw : null;

  const syncResult = await syncNotifications({
    cursor,
    upserts: pending.map((notification) => ({
      source_notification_id: notification.notificationId,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      source: notification.source,
      target: notification.target,
      priority: notification.priority,
      delivery: notification.delivery,
      read_at: notification.readAt,
      created_at: notification.createdAt,
      expires_at: notification.expiresAt,
    })),
  });

  if (syncResult.status === 'error') {
    errors += 1;
    logTailo('Sync', 'Notification sync pass failed', {
      message: syncResult.message,
    });
    return {
      pushed,
      pulled,
      errors,
      skippedReason: syncResult.message,
    };
  }

  for (const synced of syncResult.response.synced) {
    await markNotificationCloudSynced(db, synced.source_notification_id, {
      remoteNotificationId: synced.notification_id,
      serverSyncVersion: synced.sync_version,
      readAt: synced.read_at,
      updatedAt: synced.updated_at,
    });
    pushed += 1;
    changed = true;
  }

  for (const remote of syncResult.response.notifications) {
    const result = await upsertNotificationFromCloud(
      db,
      remote,
      resolveNotificationReadAt,
    );
    if (result.changed) {
      pulled += 1;
      changed = true;
    }
  }

  if (syncResult.response.next_cursor) {
    await setSyncStateValue(
      db,
      NOTIFICATIONS_CURSOR_KEY,
      syncResult.response.next_cursor,
    );
  }

  if (changed) {
    emitNotificationChange();
  }

  return {
    pushed,
    pulled,
    errors,
    skippedReason: null,
  };
}
