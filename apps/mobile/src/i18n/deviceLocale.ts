import { DEFAULT_LOCALE, type AppLocale } from './localeTypes';

export type DeviceLocale = {
  languageTag?: string | null;
  languageCode?: string | null;
};

/** Maps the device locale list to a supported app locale. English is the fallback. */
export function resolveDeviceAppLocale(
  locales: ReadonlyArray<DeviceLocale>,
): AppLocale {
  for (const locale of locales) {
    const tag = (locale.languageTag ?? '').toLowerCase();
    const code = (locale.languageCode ?? '').toLowerCase();

    if (tag.startsWith('zh') || code === 'zh') {
      return 'zh-Hans';
    }
  }

  return DEFAULT_LOCALE;
}

/** Reads locale hints from JS Intl without a native module dependency. */
export function readDeviceLocaleCandidates(): DeviceLocale[] {
  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;

    if (!intlLocale) {
      return [];
    }

    return [
      {
        languageTag: intlLocale,
        languageCode: intlLocale.split('-')[0] ?? null,
      },
    ];
  } catch {
    return [];
  }
}

export function readDeviceAppLocale(): AppLocale {
  return resolveDeviceAppLocale(readDeviceLocaleCandidates());
}
