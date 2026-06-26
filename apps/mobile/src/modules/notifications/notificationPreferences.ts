import { useSyncExternalStore } from 'react';

import { secureStorage } from '@/modules/auth/secureStorage';

export type EmailSummaryFrequency = 'weekly' | 'off';

export type NotificationPreferences = {
  accountActivity: boolean;
  emailSummaries: EmailSummaryFrequency;
  newMemories: boolean;
  pushNotifications: boolean;
  timelineUpdates: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  accountActivity: true,
  emailSummaries: 'weekly',
  newMemories: true,
  pushNotifications: true,
  timelineUpdates: true,
};

export const NOTIFICATION_PREFERENCES_STORAGE_KEY =
  'tailo.notification_preferences';

const listeners = new Set<() => void>();
let currentPreferences: NotificationPreferences = {
  ...DEFAULT_NOTIFICATION_PREFERENCES,
};

function notifyPreferenceListeners() {
  listeners.forEach((listener) => listener());
}

function isEmailSummaryFrequency(
  value: unknown,
): value is EmailSummaryFrequency {
  return value === 'weekly' || value === 'off';
}

export function parseNotificationPreferences(
  raw: string | null | undefined,
): NotificationPreferences {
  if (!raw) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;

    return {
      accountActivity:
        typeof parsed.accountActivity === 'boolean'
          ? parsed.accountActivity
          : DEFAULT_NOTIFICATION_PREFERENCES.accountActivity,
      emailSummaries: isEmailSummaryFrequency(parsed.emailSummaries)
        ? parsed.emailSummaries
        : DEFAULT_NOTIFICATION_PREFERENCES.emailSummaries,
      newMemories:
        typeof parsed.newMemories === 'boolean'
          ? parsed.newMemories
          : DEFAULT_NOTIFICATION_PREFERENCES.newMemories,
      pushNotifications:
        typeof parsed.pushNotifications === 'boolean'
          ? parsed.pushNotifications
          : DEFAULT_NOTIFICATION_PREFERENCES.pushNotifications,
      timelineUpdates:
        typeof parsed.timelineUpdates === 'boolean'
          ? parsed.timelineUpdates
          : DEFAULT_NOTIFICATION_PREFERENCES.timelineUpdates,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

function applyNotificationPreferences(
  preferences: NotificationPreferences,
): NotificationPreferences {
  currentPreferences = preferences;
  notifyPreferenceListeners();
  return currentPreferences;
}

export async function hydrateNotificationPreferences(): Promise<NotificationPreferences> {
  const stored = await secureStorage.getItemAsync(
    NOTIFICATION_PREFERENCES_STORAGE_KEY,
  );

  return applyNotificationPreferences(parseNotificationPreferences(stored));
}

export async function setNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  await secureStorage.setItemAsync(
    NOTIFICATION_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );

  return applyNotificationPreferences(preferences);
}

export async function updateNotificationPreference<
  K extends keyof NotificationPreferences,
>(key: K, value: NotificationPreferences[K]): Promise<NotificationPreferences> {
  return setNotificationPreferences({
    ...currentPreferences,
    [key]: value,
  });
}

export function getNotificationPreferences(): NotificationPreferences {
  return currentPreferences;
}

export function subscribeNotificationPreferences(
  listener: () => void,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useNotificationPreferences(): NotificationPreferences {
  return useSyncExternalStore(
    subscribeNotificationPreferences,
    getNotificationPreferences,
    () => DEFAULT_NOTIFICATION_PREFERENCES,
  );
}
