import type { NotificationDelivery, NotificationPriority } from '@tailo/shared';

import { logTailo } from '@/lib/tailoLogger';

import {
  createLocalNotification,
  createLocalNotificationIfRecentUnreadMissing,
} from './notificationService';
import { resolveNotificationDelivery } from './pushDelivery';

const RECENT_WINDOW_SECONDS = {
  accountReminder: 6 * 60 * 60,
  continuityRisk: 24 * 60 * 60,
  syncComplete: 30 * 60,
} as const;

type ProducerTarget =
  | { type: 'timeline' }
  | { type: 'event_detail'; local_event_id: string }
  | { type: 'account_settings'; mode?: 'link' | 'create' };

function buildNotificationId(parts: (string | number)[]): string {
  return parts
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '-');
}

async function createProducerNotification(input: {
  idParts: (string | number)[];
  title: string;
  body: string;
  kind: 'account_reminder' | 'sync_complete' | 'ai_job_complete' | 'continuity_risk';
  source: 'account' | 'sync' | 'cloud_job' | 'local_app';
  target: ProducerTarget;
  priority?: NotificationPriority;
  delivery?: NotificationDelivery;
  dedupeWindowSeconds?: number;
}): Promise<void> {
  const notification = {
    notificationId: buildNotificationId(input.idParts),
    kind: input.kind,
    title: input.title,
    body: input.body,
    source: input.source,
    target: input.target,
    priority: input.priority ?? 'normal',
    delivery: resolveNotificationDelivery(input.delivery ?? 'in_app'),
  } as const;

  try {
    if (input.dedupeWindowSeconds) {
      await createLocalNotificationIfRecentUnreadMissing(notification, {
        withinSeconds: input.dedupeWindowSeconds,
      });
      return;
    }

    await createLocalNotification(notification);
  } catch (error) {
    logTailo('Sync', 'Failed to create local notification', {
      kind: input.kind,
      source: input.source,
      message: error instanceof Error ? error.message : 'Unknown error.',
    });
  }
}

export async function createAccountReminderNotification(): Promise<void> {
  await createProducerNotification({
    idParts: ['account-reminder', Date.now()],
    kind: 'account_reminder',
    source: 'account',
    title: 'Save your memories',
    body: 'Connect an account to keep your moments safe across devices.',
    target: { type: 'account_settings', mode: 'link' },
    dedupeWindowSeconds: RECENT_WINDOW_SECONDS.accountReminder,
  });
}

export async function createContinuityRiskNotification(): Promise<void> {
  await createProducerNotification({
    idParts: ['continuity-risk', Date.now()],
    kind: 'continuity_risk',
    source: 'local_app',
    title: 'Protect this timeline',
    body: 'This device can lose anonymous moments after reinstall. Connect an account when ready.',
    target: { type: 'account_settings', mode: 'link' },
    delivery: 'both',
    priority: 'high',
    dedupeWindowSeconds: RECENT_WINDOW_SECONDS.continuityRisk,
  });
}

export async function createSyncCompletionNotification(input: {
  syncedCount: number;
  errorCount: number;
}): Promise<void> {
  if (input.syncedCount <= 0 && input.errorCount <= 0) {
    return;
  }

  const title =
    input.errorCount > 0 ? 'Some moments need retry' : 'Moments synced';
  const body =
    input.errorCount > 0
      ? `${input.syncedCount} moment${input.syncedCount === 1 ? '' : 's'} synced, ${input.errorCount} need${input.errorCount === 1 ? 's' : ''} retry.`
      : `${input.syncedCount} moment${input.syncedCount === 1 ? '' : 's'} synced to your account.`;

  await createProducerNotification({
    idParts: ['sync-complete', input.syncedCount, input.errorCount, Date.now()],
    kind: 'sync_complete',
    source: 'sync',
    title,
    body,
    target: { type: 'timeline' },
    dedupeWindowSeconds: RECENT_WINDOW_SECONDS.syncComplete,
  });
}

export async function createAiJobCompletionNotification(input: {
  localEventId: string;
}): Promise<void> {
  await createProducerNotification({
    idParts: ['ai-job-complete', input.localEventId],
    kind: 'ai_job_complete',
    source: 'cloud_job',
    title: 'Moment updated',
    body: 'A saved moment has a fresh caption.',
    target: { type: 'event_detail', local_event_id: input.localEventId },
  });
}
