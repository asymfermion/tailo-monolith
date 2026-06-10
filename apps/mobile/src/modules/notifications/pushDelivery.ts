import type { NotificationDelivery } from '@tailo/shared';

let isPushAvailable = false;

export function setPushAvailabilityForTests(value: boolean): void {
  isPushAvailable = value;
}

export function resolveNotificationDelivery(
  requested: NotificationDelivery,
): NotificationDelivery {
  if (requested === 'in_app') {
    return 'in_app';
  }

  if (!isPushAvailable) {
    return 'in_app';
  }

  return requested;
}
