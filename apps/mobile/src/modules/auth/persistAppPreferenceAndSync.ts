import { setAppFontStyle, type AppFontStyle } from '@/lib/appFontStyle';
import type { AppTheme } from '@/constants/theme';
import { setAppTheme } from '@/lib/appTheme';
import { setAppLocale, type AppLocale } from '@/i18n/locale';
import {
  setNotificationPreferences,
  type NotificationPreferences,
} from '@/modules/notifications/notificationPreferences';

import {
  syncRemoteAccountProfile,
  type SyncRemoteAccountProfilePatch,
  type SyncRemoteAccountProfileResult,
} from './remoteAccountProfile';

export type PersistAppPreferenceResult =
  | { status: 'local_only' }
  | SyncRemoteAccountProfileResult;

async function persistAppPreferenceAndSync(
  applyLocal: () => Promise<void>,
  remotePatch: SyncRemoteAccountProfilePatch,
  options: { syncToRemoteProfile: boolean },
): Promise<PersistAppPreferenceResult> {
  await applyLocal();

  if (!options.syncToRemoteProfile) {
    return { status: 'local_only' };
  }

  return syncRemoteAccountProfile(remotePatch);
}

export async function setAppLocaleAndSyncProfile(
  locale: AppLocale,
  options: { syncToRemoteProfile: boolean },
): Promise<PersistAppPreferenceResult> {
  return persistAppPreferenceAndSync(
    async () => {
      await setAppLocale(locale);
    },
    { preferredLocale: locale },
    options,
  );
}

export async function setAppThemeAndSyncProfile(
  theme: AppTheme,
  options: { syncToRemoteProfile: boolean },
): Promise<PersistAppPreferenceResult> {
  return persistAppPreferenceAndSync(
    async () => {
      await setAppTheme(theme);
    },
    { preferredTheme: theme },
    options,
  );
}

export async function setAppFontStyleAndSyncProfile(
  fontStyle: AppFontStyle,
  options: { syncToRemoteProfile: boolean },
): Promise<PersistAppPreferenceResult> {
  return persistAppPreferenceAndSync(
    async () => {
      await setAppFontStyle(fontStyle);
    },
    { preferredFontStyle: fontStyle },
    options,
  );
}

export async function setNotificationPreferencesAndSyncProfile(
  preferences: NotificationPreferences,
  options: { syncToRemoteProfile: boolean },
): Promise<PersistAppPreferenceResult> {
  return persistAppPreferenceAndSync(
    async () => {
      await setNotificationPreferences(preferences);
    },
    { notificationPreferences: preferences },
    options,
  );
}
