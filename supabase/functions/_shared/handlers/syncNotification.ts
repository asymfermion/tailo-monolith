import {
  decodeNotificationUpdateCursor,
  encodeNotificationUpdateCursor,
  parseSyncNotificationsRequest,
  type SyncNotificationRequest,
} from '../../../../packages/shared/src/contracts/notification-updates.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

const DEFAULT_LIMIT = 50;

function mergeReadAt(
  existingReadAt: string | null | undefined,
  incomingReadAt: string | null | undefined,
): string | null {
  if (!existingReadAt) {
    return incomingReadAt ?? null;
  }

  if (!incomingReadAt) {
    return existingReadAt;
  }

  const existingMs = Date.parse(existingReadAt);
  const incomingMs = Date.parse(incomingReadAt);

  if (!Number.isFinite(existingMs)) {
    return incomingReadAt;
  }

  if (!Number.isFinite(incomingMs)) {
    return existingReadAt;
  }

  return incomingMs >= existingMs ? incomingReadAt : existingReadAt;
}

async function upsertOneNotification(
  appUserId: string,
  body: SyncNotificationRequest,
  adminClient: ReturnType<typeof getServiceRoleClient>,
) {
  const { data: existing, error: existingError } = await adminClient
    .from('notification_items')
    .select('notification_item_id, sync_version, read_at')
    .eq('app_user_id', appUserId)
    .eq('source_notification_id', body.source_notification_id)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message } as const;
  }

  const now = new Date().toISOString();
  const nextSyncVersion = (existing?.sync_version ?? 0) + 1;
  const mergedReadAt = mergeReadAt(existing?.read_at, body.read_at ?? null);
  const notificationId = existing?.notification_item_id ?? crypto.randomUUID();

  const { error: upsertError } = await adminClient.from('notification_items').upsert(
    {
      notification_item_id: notificationId,
      app_user_id: appUserId,
      source_notification_id: body.source_notification_id,
      kind: body.kind,
      title: body.title,
      body: body.body,
      source: body.source,
      target: body.target,
      priority: body.priority,
      delivery: body.delivery,
      read_at: mergedReadAt,
      created_at: body.created_at ?? now,
      expires_at: body.expires_at ?? null,
      sync_version: nextSyncVersion,
      updated_at: now,
    },
    { onConflict: 'app_user_id,source_notification_id' },
  );

  if (upsertError) {
    return { error: upsertError.message } as const;
  }

  return {
    notification_id: notificationId,
    source_notification_id: body.source_notification_id,
    sync_version: nextSyncVersion,
    read_at: mergedReadAt,
    updated_at: now,
  } as const;
}

export const handleSyncNotifications: ApiHandler = async ({ user, log, payload }) => {
  const body = parseSyncNotificationsRequest(payload);

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 422);
  }

  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  const synced: Array<{
    notification_id: string;
    source_notification_id: string;
    sync_version: number;
    read_at: string | null;
    updated_at: string;
  }> = [];

  for (const row of body.upserts ?? []) {
    const result = await upsertOneNotification(appUser.appUserId, row, adminClient);

    if ('error' in result) {
      return jsonResponse({ error: result.error }, 500);
    }

    synced.push(result);
  }

  const limit = body.limit ?? DEFAULT_LIMIT;
  const cursor = decodeNotificationUpdateCursor(body.cursor);

  let query = adminClient
    .from('notification_items')
    .select(
      'notification_item_id, source_notification_id, kind, title, body, source, target, priority, delivery, read_at, created_at, expires_at, sync_version, updated_at',
    )
    .eq('app_user_id', appUser.appUserId)
    .order('updated_at', { ascending: true })
    .order('notification_item_id', { ascending: true })
    .limit(limit);

  if (cursor) {
    query = query.or(
      `updated_at.gt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},notification_item_id.gt.${cursor.notificationId})`,
    );
  }

  const { data: rows, error } = await query;

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const notifications = (rows ?? []).map((row) => ({
    notification_id: row.notification_item_id,
    source_notification_id: row.source_notification_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    source: row.source,
    target: row.target,
    priority: row.priority,
    delivery: row.delivery,
    read_at: row.read_at,
    created_at: row.created_at,
    expires_at: row.expires_at,
    sync_version: row.sync_version,
    updated_at: row.updated_at,
  }));

  const last = notifications.at(-1);
  const nextCursor =
    notifications.length === limit && last
      ? encodeNotificationUpdateCursor({
          updatedAt: last.updated_at,
          notificationId: last.notification_id,
        })
      : null;

  log.info('notifications_sync_ok', {
    appUserId: appUser.appUserId,
    pushedCount: synced.length,
    pulledCount: notifications.length,
    hasNextCursor: Boolean(nextCursor),
  });

  return jsonResponse({
    synced,
    notifications,
    next_cursor: nextCursor,
  });
};
