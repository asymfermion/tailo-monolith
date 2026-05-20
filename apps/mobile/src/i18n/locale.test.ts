import { secureStorage } from '@/modules/auth/secureStorage';

import {
  DEFAULT_LOCALE,
  getIntlLocale,
  hydrateAppLocale,
  setAppLocale,
} from './locale';
import { formatCount, pluralSuffix, t } from './t';

jest.mock('@/modules/auth/secureStorage', () => ({
  secureStorage: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));

const storage = jest.mocked(secureStorage);

describe('locale switching', () => {
  beforeEach(async () => {
    storage.getItemAsync.mockReset();
    storage.setItemAsync.mockReset();
    storage.deleteItemAsync.mockReset();

    storage.getItemAsync.mockResolvedValue(null);
    storage.setItemAsync.mockResolvedValue(undefined);
    storage.deleteItemAsync.mockResolvedValue(undefined);

    await setAppLocale(DEFAULT_LOCALE);
  });

  it('uses English by default', () => {
    expect(t('common.continue')).toBe('Continue');
  });

  it('switches to Simplified Chinese and persists the choice', async () => {
    await setAppLocale('zh-Hans');

    expect(t('common.continue')).toBe('继续');
    expect(t('settings.languages.simplifiedChinese')).toBe('简体中文');
    expect(formatCount(1200)).toBe(
      new Intl.NumberFormat('zh-Hans').format(1200),
    );
    expect(pluralSuffix(2)).toBe('');
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      'tailo.app_locale',
      'zh-Hans',
    );
  });

  it('maps app locale to Intl BCP 47 tags', async () => {
    await setAppLocale('zh-Hans');
    expect(getIntlLocale()).toBe('zh-CN');

    await setAppLocale('en');
    expect(getIntlLocale()).toBe('en-US');
  });

  it('hydrates a stored locale', async () => {
    storage.getItemAsync.mockResolvedValue('zh-Hans');

    const locale = await hydrateAppLocale();

    expect(locale).toBe('zh-Hans');
    expect(t('startup.retry')).toBe('重试');
  });
});
