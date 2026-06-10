export const APP_LOCALES = ['en', 'zh-Hans'] as const;
export const DEFAULT_LOCALE = 'en' as const;
export const APP_LOCALE_STORAGE_KEY = 'tailo.app_locale';

export type AppLocale = (typeof APP_LOCALES)[number];

export function isAppLocale(
  value: string | null | undefined,
): value is AppLocale {
  return value === 'en' || value === 'zh-Hans';
}
