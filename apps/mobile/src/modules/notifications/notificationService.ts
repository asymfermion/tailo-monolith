import type { NotificationRecord } from '@tailo/shared';

import { getDatabase } from '@/db';

import {
  getUnreadNotificationCount,
  hasRecentUnreadNotification,
  insertNotification,
  listNotifications,
  markNotificationRead,
  markUnreadNotificationsReadByKinds,
  type NewNotificationInput,
} from './notificationRepository';
import { emitNotificationChange } from './notificationStore';

export async function createLocalNotification(
  input: NewNotificationInput,
): Promise<boolean> {
  const db = await getDatabase();
  const inserted = await insertNotification(db, input);

  if (inserted) {
    emitNotificationChange();
  }

  return inserted;
}

export async function createLocalNotificationIfRecentUnreadMissing(
  input: NewNotificationInput,
  options: {
    withinSeconds: number;
  },
): Promise<boolean> {
  const db = await getDatabase();
  const exists = await hasRecentUnreadNotification(db, {
    kind: input.kind,
    source: input.source,
    target: input.target,
    withinSeconds: options.withinSeconds,
  });

  if (exists) {
    return false;
  }

  const inserted = await insertNotification(db, input);

  if (inserted) {
    emitNotificationChange();
  }

  return inserted;
}

export async function loadNotifications(options?: {
  includeRead?: boolean;
  limit?: number;
}): Promise<NotificationRecord[]> {
  const db = await getDatabase();
  return listNotifications(db, options);
}

export async function loadUnreadNotificationsCount(): Promise<number> {
  const db = await getDatabase();
  return getUnreadNotificationCount(db);
}

const ACCOUNT_UPGRADE_NOTIFICATION_KINDS = [
  'account_reminder',
  'continuity_risk',
] as const;

/** Clears anonymous-account upgrade prompts after the user links Apple, Google, or email. */
export async function dismissAccountUpgradeNotifications(): Promise<number> {
  const db = await getDatabase();
  const dismissed = await markUnreadNotificationsReadByKinds(
    db,
    [...ACCOUNT_UPGRADE_NOTIFICATION_KINDS],
  );

  if (dismissed > 0) {
    emitNotificationChange();
  }

  return dismissed;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<boolean> {
  const db = await getDatabase();
  const updated = await markNotificationRead(db, notificationId);

  if (updated) {
    emitNotificationChange();
  }

  return updated;
}
