import {
  readDeviceLocaleCandidates,
  resolveDeviceAppLocale,
} from './deviceLocale';
import { DEFAULT_LOCALE } from './localeTypes';

describe('resolveDeviceAppLocale', () => {
  it('maps Chinese device locales to Simplified Chinese', () => {
    expect(
      resolveDeviceAppLocale([
        { languageTag: 'zh-Hant-TW', languageCode: 'zh' },
      ]),
    ).toBe('zh-Hans');
    expect(
      resolveDeviceAppLocale([{ languageTag: 'zh-CN', languageCode: 'zh' }]),
    ).toBe('zh-Hans');
  });

  it('defaults to English when no supported locale is present', () => {
    expect(
      resolveDeviceAppLocale([{ languageTag: 'ja-JP', languageCode: 'ja' }]),
    ).toBe(DEFAULT_LOCALE);
    expect(resolveDeviceAppLocale([])).toBe(DEFAULT_LOCALE);
  });
});

describe('readDeviceLocaleCandidates', () => {
  it('returns an Intl locale candidate when available', () => {
    const candidates = readDeviceLocaleCandidates();

    if (candidates.length === 0) {
      return;
    }

    expect(candidates[0]?.languageTag).toEqual(expect.any(String));
    expect(candidates[0]?.languageCode).toEqual(expect.any(String));
  });
});
