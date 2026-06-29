export const NOTIFICATION_KINDS = [
  'account_reminder',
  'sync_complete',
  'ai_job_complete',
  'continuity_risk',
  'system',
] as const;

export const NOTIFICATION_SOURCES = [
  'local_app',
  'cloud_job',
  'sync',
  'account',
  'system',
] as const;

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high'] as const;

export const NOTIFICATION_DELIVERIES = ['in_app', 'push', 'both'] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
export type NotificationDelivery = (typeof NOTIFICATION_DELIVERIES)[number];

export type NotificationTarget =
  | { type: 'timeline' }
  | { type: 'event_detail'; local_event_id: string }
  | { type: 'account_settings'; mode?: 'link' | 'create' };

export type NotificationRecord = {
  notification_id: string;
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
};

type NotificationTargetObject = Record<string, unknown>;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNotificationKind(value: unknown): value is NotificationKind {
  return (
    isString(value) && (NOTIFICATION_KINDS as readonly string[]).includes(value)
  );
}

export function isNotificationSource(
  value: unknown,
): value is NotificationSource {
  return (
    isString(value) &&
    (NOTIFICATION_SOURCES as readonly string[]).includes(value)
  );
}

export function isNotificationPriority(
  value: unknown,
): value is NotificationPriority {
  return (
    isString(value) &&
    (NOTIFICATION_PRIORITIES as readonly string[]).includes(value)
  );
}

export function isNotificationDelivery(
  value: unknown,
): value is NotificationDelivery {
  return (
    isString(value) &&
    (NOTIFICATION_DELIVERIES as readonly string[]).includes(value)
  );
}

export function isNotificationTarget(
  value: unknown,
): value is NotificationTarget {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const target = value as NotificationTargetObject;
  const type = target.type;

  if (type === 'timeline') {
    return true;
  }

  if (type === 'event_detail') {
    return isString(target.local_event_id) && target.local_event_id.length > 0;
  }

  if (type === 'account_settings') {
    const mode = target.mode;
    return mode === undefined || mode === 'link' || mode === 'create';
  }

  return false;
}

export function isNotificationRecord(
  value: unknown,
): value is NotificationRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    isString(row.notification_id) &&
    isNotificationKind(row.kind) &&
    isString(row.title) &&
    isString(row.body) &&
    isNotificationSource(row.source) &&
    isNotificationTarget(row.target) &&
    isNotificationPriority(row.priority) &&
    isNotificationDelivery(row.delivery) &&
    (row.read_at === null || isString(row.read_at)) &&
    isString(row.created_at) &&
    (row.expires_at === null || isString(row.expires_at))
  );
}
