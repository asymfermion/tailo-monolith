import {
  isNotificationDelivery,
  isNotificationKind,
  isNotificationPriority,
  isNotificationSource,
  isNotificationTarget,
  type NotificationDelivery,
  type NotificationKind,
  type NotificationPriority,
  type NotificationSource,
  type NotificationTarget,
} from './notifications.ts';

export type RemoteNotificationUpdate = {
  notification_id: string;
  source_notification_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  source: NotificationSource;
  target: NotificationTarget;
  priority: NotificationPriority;
  delivery: NotificationDelivery;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
  sync_version: number;
  updated_at: string;
};

export type SyncNotificationRequest = {
  source_notification_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  source: NotificationSource;
  target: NotificationTarget;
  priority: NotificationPriority;
  delivery: NotificationDelivery;
  read_at?: string | null;
  created_at?: string;
  expires_at?: string | null;
};

export type SyncNotificationResponse = {
  notification_id: string;
  source_notification_id: string;
  sync_version: number;
  read_at: string | null;
  updated_at: string;
};

export type GetNotificationUpdatesRequest = {
  cursor?: string | null;
  limit?: number;
};

export type GetNotificationUpdatesResponse = {
  notifications: RemoteNotificationUpdate[];
  next_cursor: string | null;
};

export type SyncNotificationsRequest = {
  cursor?: string | null;
  limit?: number;
  upserts?: SyncNotificationRequest[];
};

export type SyncNotificationsResponse = {
  synced: SyncNotificationResponse[];
  notifications: RemoteNotificationUpdate[];
  next_cursor: string | null;
};

export function parseSyncNotificationRequest(
  body: unknown,
): SyncNotificationRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sourceNotificationId = Reflect.get(body, 'source_notification_id');
  const kind = Reflect.get(body, 'kind');
  const title = Reflect.get(body, 'title');
  const contentBody = Reflect.get(body, 'body');
  const source = Reflect.get(body, 'source');
  const target = Reflect.get(body, 'target');
  const priority = Reflect.get(body, 'priority');
  const delivery = Reflect.get(body, 'delivery');
  const readAt = Reflect.get(body, 'read_at');
  const createdAt = Reflect.get(body, 'created_at');
  const expiresAt = Reflect.get(body, 'expires_at');

  if (typeof sourceNotificationId !== 'string' || sourceNotificationId.length === 0) {
    return null;
  }

  if (typeof title !== 'string' || title.length === 0) {
    return null;
  }

  if (typeof contentBody !== 'string' || contentBody.length === 0) {
    return null;
  }

  if (
    !isNotificationKind(kind) ||
    !isNotificationSource(source) ||
    !isNotificationTarget(target) ||
    !isNotificationPriority(priority) ||
    !isNotificationDelivery(delivery)
  ) {
    return null;
  }

  if (readAt !== undefined && readAt !== null && typeof readAt !== 'string') {
    return null;
  }

  if (createdAt !== undefined && typeof createdAt !== 'string') {
    return null;
  }

  if (expiresAt !== undefined && expiresAt !== null && typeof expiresAt !== 'string') {
    return null;
  }

  return {
    source_notification_id: sourceNotificationId,
    kind,
    title,
    body: contentBody,
    source,
    target,
    priority,
    delivery,
    read_at: readAt === undefined ? undefined : (readAt as string | null),
    created_at: createdAt === undefined ? undefined : createdAt,
    expires_at: expiresAt === undefined ? undefined : (expiresAt as string | null),
  };
}

export function parseGetNotificationUpdatesRequest(
  body: unknown,
): GetNotificationUpdatesRequest | null {
  if (body === null || body === undefined) {
    return {};
  }

  if (typeof body !== 'object') {
    return null;
  }

  const cursor = Reflect.get(body, 'cursor');
  const limit = Reflect.get(body, 'limit');

  if (cursor !== undefined && cursor !== null && typeof cursor !== 'string') {
    return null;
  }

  if (
    limit !== undefined &&
    (typeof limit !== 'number' || limit < 1 || limit > 50)
  ) {
    return null;
  }

  return {
    cursor: typeof cursor === 'string' ? cursor : null,
    limit: typeof limit === 'number' ? limit : undefined,
  };
}

export function parseSyncNotificationsRequest(
  body: unknown,
): SyncNotificationsRequest | null {
  const poll = parseGetNotificationUpdatesRequest(body);

  if (poll === null) {
    return null;
  }

  if (body === null || body === undefined) {
    return {
      cursor: poll.cursor,
      limit: poll.limit,
      upserts: [],
    };
  }

  if (typeof body !== 'object') {
    return null;
  }

  const rawUpserts = Reflect.get(body, 'upserts');

  if (rawUpserts === undefined) {
    return {
      cursor: poll.cursor,
      limit: poll.limit,
      upserts: [],
    };
  }

  if (!Array.isArray(rawUpserts)) {
    return null;
  }

  const upserts: SyncNotificationRequest[] = [];
  for (const item of rawUpserts) {
    const parsed = parseSyncNotificationRequest(item);
    if (!parsed) {
      return null;
    }
    upserts.push(parsed);
  }

  return {
    cursor: poll.cursor,
    limit: poll.limit,
    upserts,
  };
}

export function isGetNotificationUpdatesResponse(
  value: unknown,
): value is GetNotificationUpdatesResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const notifications = Reflect.get(value, 'notifications');
  const nextCursor = Reflect.get(value, 'next_cursor');

  if (!Array.isArray(notifications)) {
    return false;
  }

  if (nextCursor !== null && typeof nextCursor !== 'string') {
    return false;
  }

  return notifications.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const row = item as Record<string, unknown>;

    return (
      typeof row.notification_id === 'string' &&
      typeof row.source_notification_id === 'string' &&
      isNotificationKind(row.kind) &&
      typeof row.title === 'string' &&
      typeof row.body === 'string' &&
      isNotificationSource(row.source) &&
      isNotificationTarget(row.target) &&
      isNotificationPriority(row.priority) &&
      isNotificationDelivery(row.delivery) &&
      (row.read_at === null || typeof row.read_at === 'string') &&
      typeof row.created_at === 'string' &&
      (row.expires_at === null || typeof row.expires_at === 'string') &&
      typeof row.sync_version === 'number' &&
      typeof row.updated_at === 'string'
    );
  });
}

export function isSyncNotificationsResponse(
  value: unknown,
): value is SyncNotificationsResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const synced = Reflect.get(value, 'synced');
  const notifications = Reflect.get(value, 'notifications');
  const nextCursor = Reflect.get(value, 'next_cursor');

  if (!Array.isArray(synced) || !Array.isArray(notifications)) {
    return false;
  }

  if (nextCursor !== null && typeof nextCursor !== 'string') {
    return false;
  }

  const syncedValid = synced.every((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }

    const item = row as Record<string, unknown>;
    return (
      typeof item.notification_id === 'string' &&
      typeof item.source_notification_id === 'string' &&
      typeof item.sync_version === 'number' &&
      (item.read_at === null || typeof item.read_at === 'string') &&
      typeof item.updated_at === 'string'
    );
  });

  return syncedValid && isGetNotificationUpdatesResponse({
    notifications,
    next_cursor: nextCursor,
  });
}

type NotificationUpdateCursor = {
  updatedAt: string;
  notificationId: string;
};

export function encodeNotificationUpdateCursor(
  cursor: NotificationUpdateCursor,
): string {
  const json = JSON.stringify({
    u: cursor.updatedAt,
    n: cursor.notificationId,
  });
  return encodeBase64(json);
}

export function decodeNotificationUpdateCursor(
  cursor: string | null | undefined,
): NotificationUpdateCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = decodeBase64(cursor);
    const parsed = JSON.parse(decoded) as { u?: unknown; n?: unknown };

    if (typeof parsed.u !== 'string' || typeof parsed.n !== 'string') {
      return null;
    }

    return {
      updatedAt: parsed.u,
      notificationId: parsed.n,
    };
  } catch {
    return null;
  }
}

function encodeBase64(value: string): string {
  if (typeof btoa === 'function') {
    return btoa(value);
  }

  return Buffer.from(value, 'utf-8').toString('base64');
}

function decodeBase64(value: string): string {
  if (typeof atob === 'function') {
    return atob(value);
  }

  return Buffer.from(value, 'base64').toString('utf-8');
}
