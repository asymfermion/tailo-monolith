import { describe, expect, it } from 'vitest';

import {
  isNotificationRecord,
  isNotificationTarget,
  type NotificationRecord,
} from './notifications.ts';

const baseRecord: NotificationRecord = {
  notification_id: 'notif-1',
  kind: 'account_reminder',
  title: 'Save your memories',
  body: 'Connect an account to keep your moments safe.',
  source: 'account',
  target: { type: 'account_settings', mode: 'link' },
  priority: 'normal',
  delivery: 'in_app',
  read_at: null,
  created_at: '2026-06-06T10:00:00.000Z',
  expires_at: null,
};

describe('notifications contract', () => {
  it('accepts valid notification records', () => {
    expect(isNotificationRecord(baseRecord)).toBe(true);
  });

  it('rejects invalid target payloads', () => {
    expect(
      isNotificationTarget({
        type: 'event_detail',
        local_event_id: '',
      }),
    ).toBe(false);
    expect(isNotificationTarget({ type: 'unknown' })).toBe(false);
  });

  it('rejects invalid notification records', () => {
    expect(
      isNotificationRecord({
        ...baseRecord,
        priority: 'urgent',
      }),
    ).toBe(false);
  });
});
