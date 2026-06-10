import {
  createAiJobCompletionNotification,
  createContinuityRiskNotification,
} from './notificationProducers';
import { setPushAvailabilityForTests } from './pushDelivery';

jest.mock('./notificationService', () => ({
  createLocalNotification: jest.fn(async () => true),
  createLocalNotificationIfRecentUnreadMissing: jest.fn(async () => true),
}));

const notificationService = jest.requireMock('./notificationService') as {
  createLocalNotification: jest.Mock;
  createLocalNotificationIfRecentUnreadMissing: jest.Mock;
};

describe('notificationProducers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPushAvailabilityForTests(false);
  });

  it('falls back to in-app delivery when push is unavailable', async () => {
    await createContinuityRiskNotification();

    expect(
      notificationService.createLocalNotificationIfRecentUnreadMissing,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'continuity_risk',
        delivery: 'in_app',
      }),
      expect.objectContaining({
        withinSeconds: expect.any(Number),
      }),
    );
  });

  it('creates ai completion notification targeting event detail', async () => {
    await createAiJobCompletionNotification({ localEventId: 'event-42' });

    expect(notificationService.createLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'ai-job-complete:event-42',
        target: { type: 'event_detail', local_event_id: 'event-42' },
      }),
    );
  });
});
