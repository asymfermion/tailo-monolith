import { parseNotificationPreferences } from './notificationPreferences';

describe('parseNotificationPreferences', () => {
  it('returns defaults when storage is empty', () => {
    expect(parseNotificationPreferences(null)).toEqual({
      accountActivity: true,
      emailSummaries: 'weekly',
      newMemories: true,
      pushNotifications: true,
      timelineUpdates: true,
    });
  });

  it('parses stored preferences and falls back invalid fields', () => {
    expect(
      parseNotificationPreferences(
        JSON.stringify({
          newMemories: false,
          timelineUpdates: 'yes',
          emailSummaries: 'monthly',
        }),
      ),
    ).toEqual({
      accountActivity: true,
      emailSummaries: 'weekly',
      newMemories: false,
      pushNotifications: true,
      timelineUpdates: true,
    });
  });
});
