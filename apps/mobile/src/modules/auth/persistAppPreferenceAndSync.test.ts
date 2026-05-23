import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { setAppFontStyle } from '@/lib/appFontStyle';
import { setAppTheme } from '@/lib/appTheme';
import { setAppLocale } from '@/i18n/locale';

import { syncRemoteAccountProfile } from './remoteAccountProfile';
import {
  setAppFontStyleAndSyncProfile,
  setAppLocaleAndSyncProfile,
  setAppThemeAndSyncProfile,
} from './persistAppPreferenceAndSync';

jest.mock('@/i18n/locale', () => ({
  setAppLocale: jest.fn(),
}));

jest.mock('@/lib/appTheme', () => ({
  setAppTheme: jest.fn(),
}));

jest.mock('@/lib/appFontStyle', () => ({
  setAppFontStyle: jest.fn(),
}));

jest.mock('./remoteAccountProfile', () => ({
  syncRemoteAccountProfile: jest.fn(),
}));

const syncedResponse = {
  app_user_id: 'user-1',
  display_name: null,
  preferred_locale: 'en',
  preferred_theme: 'dark',
  preferred_font_style: 'serif',
  created: false,
  updated_at: '2026-05-19T00:00:00.000Z',
};

describe('persistAppPreferenceAndSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(setAppLocale).mockResolvedValue('en');
    jest.mocked(setAppTheme).mockResolvedValue('light');
    jest.mocked(setAppFontStyle).mockResolvedValue('system');
    jest.mocked(syncRemoteAccountProfile).mockResolvedValue({
      status: 'synced',
      response: syncedResponse,
    });
  });

  it('only updates local locale when remote sync is disabled', async () => {
    const result = await setAppLocaleAndSyncProfile('zh-Hans', {
      syncToRemoteProfile: false,
    });

    expect(setAppLocale).toHaveBeenCalledWith('zh-Hans');
    expect(syncRemoteAccountProfile).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'local_only' });
  });

  it('syncs locale to the linked account profile', async () => {
    const result = await setAppLocaleAndSyncProfile('zh-Hans', {
      syncToRemoteProfile: true,
    });

    expect(syncRemoteAccountProfile).toHaveBeenCalledWith({
      preferredLocale: 'zh-Hans',
    });
    expect(result.status).toBe('synced');
  });

  it('syncs theme to the linked account profile', async () => {
    const result = await setAppThemeAndSyncProfile('dark', {
      syncToRemoteProfile: true,
    });

    expect(setAppTheme).toHaveBeenCalledWith('dark');
    expect(syncRemoteAccountProfile).toHaveBeenCalledWith({
      preferredTheme: 'dark',
    });
    expect(result.status).toBe('synced');
  });

  it('syncs font style to the linked account profile', async () => {
    const result = await setAppFontStyleAndSyncProfile('rounded', {
      syncToRemoteProfile: true,
    });

    expect(setAppFontStyle).toHaveBeenCalledWith('rounded');
    expect(syncRemoteAccountProfile).toHaveBeenCalledWith({
      preferredFontStyle: 'rounded',
    });
    expect(result.status).toBe('synced');
  });
});
