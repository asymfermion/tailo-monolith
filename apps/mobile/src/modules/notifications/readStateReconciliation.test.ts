import { resolveNotificationReadAt } from './readStateReconciliation';

describe('resolveNotificationReadAt', () => {
  it('returns remote read state when local is unread', () => {
    expect(
      resolveNotificationReadAt(null, '2026-06-06T11:00:00.000Z'),
    ).toBe('2026-06-06T11:00:00.000Z');
  });

  it('keeps local read state when remote is older', () => {
    expect(
      resolveNotificationReadAt(
        '2026-06-06T12:00:00.000Z',
        '2026-06-06T11:00:00.000Z',
      ),
    ).toBe('2026-06-06T12:00:00.000Z');
  });

  it('accepts remote read state when newer', () => {
    expect(
      resolveNotificationReadAt(
        '2026-06-06T11:00:00.000Z',
        '2026-06-06T12:00:00.000Z',
      ),
    ).toBe('2026-06-06T12:00:00.000Z');
  });
});
