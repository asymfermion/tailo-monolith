import { useSyncExternalStore } from 'react';

import { secureStorage } from '@/modules/auth/secureStorage';

export const APP_LOCALES = ['en', 'zh-Hans'] as const;
export const DEFAULT_LOCALE = 'en' as const;
export const APP_LOCALE_STORAGE_KEY = 'tailo.app_locale';

export type AppLocale = (typeof APP_LOCALES)[number];

let currentLocale: AppLocale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function isAppLocale(
  value: string | null | undefined,
): value is AppLocale {
  return value === 'en' || value === 'zh-Hans';
}

export function getAppLocale(): AppLocale {
  return currentLocale;
}

function notifyLocaleListeners() {
  listeners.forEach((listener) => listener());
}

function applyAppLocale(locale: AppLocale): AppLocale {
  if (currentLocale === locale) {
    return currentLocale;
  }

  currentLocale = locale;
  notifyLocaleListeners();
  return currentLocale;
}

export async function hydrateAppLocale(): Promise<AppLocale> {
  const storedLocale = await secureStorage.getItemAsync(APP_LOCALE_STORAGE_KEY);

  if (isAppLocale(storedLocale)) {
    return applyAppLocale(storedLocale);
  }

  return currentLocale;
}

export async function setAppLocale(locale: AppLocale): Promise<AppLocale> {
  await secureStorage.setItemAsync(APP_LOCALE_STORAGE_KEY, locale);
  return applyAppLocale(locale);
}

export function subscribeAppLocale(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useAppLocale(): AppLocale {
  return useSyncExternalStore(
    subscribeAppLocale,
    getAppLocale,
    () => DEFAULT_LOCALE,
  );
}

/** BCP 47 tag for `Intl` formatters (dates, numbers). */
export function getIntlLocale(locale: AppLocale = getAppLocale()): string {
  return locale === 'zh-Hans' ? 'zh-CN' : 'en-US';
}
