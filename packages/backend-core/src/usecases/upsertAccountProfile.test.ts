import { describe, expect, it } from 'vitest';

import { resolveUpsertAccountProfile } from './upsertAccountProfile';

describe('resolveUpsertAccountProfile', () => {
  it('rejects empty patch bodies', () => {
    expect(
      resolveUpsertAccountProfile(
        { callerAppUserId: 'app-1' },
        {
          appUserId: 'app-1',
          displayName: null,
          preferredLocale: null,
          preferredTheme: null,
          preferredFontStyle: null,
        },
      ),
    ).toMatchObject({ ok: false, code: 'invalid_input' });
  });

  it('creates profile fields on first write', () => {
    expect(
      resolveUpsertAccountProfile(
        {
          callerAppUserId: 'app-1',
          displayName: '  Mochi  ',
          preferredLocale: 'zh-Hans',
          preferredTheme: 'dark',
          preferredFontStyle: 'rounded',
        },
        null,
      ),
    ).toEqual({
      ok: true,
      appUserId: 'app-1',
      displayName: 'Mochi',
      preferredLocale: 'zh-Hans',
      preferredTheme: 'dark',
      preferredFontStyle: 'rounded',
      created: true,
    });
  });

  it('rejects unsupported locales', () => {
    expect(
      resolveUpsertAccountProfile(
        { callerAppUserId: 'app-1', preferredLocale: 'fr' },
        {
          appUserId: 'app-1',
          displayName: null,
          preferredLocale: 'en',
          preferredTheme: null,
          preferredFontStyle: null,
        },
      ),
    ).toMatchObject({ ok: false, code: 'invalid_input' });
  });

  it('rejects unsupported themes', () => {
    expect(
      resolveUpsertAccountProfile(
        { callerAppUserId: 'app-1', preferredTheme: 'sepia' },
        {
          appUserId: 'app-1',
          displayName: null,
          preferredLocale: null,
          preferredTheme: 'light',
          preferredFontStyle: null,
        },
      ),
    ).toMatchObject({ ok: false, code: 'invalid_input' });
  });

  it('updates only fields present in the patch', () => {
    expect(
      resolveUpsertAccountProfile(
        { callerAppUserId: 'app-1', displayName: 'Mochi' },
        {
          appUserId: 'app-1',
          displayName: 'Old name',
          preferredLocale: 'zh-Hans',
          preferredTheme: 'dark',
          preferredFontStyle: 'serif',
        },
      ),
    ).toEqual({
      ok: true,
      appUserId: 'app-1',
      displayName: 'Mochi',
      preferredLocale: 'zh-Hans',
      preferredTheme: 'dark',
      preferredFontStyle: 'serif',
      created: false,
    });
  });

  it('rejects unsupported font styles', () => {
    expect(
      resolveUpsertAccountProfile(
        { callerAppUserId: 'app-1', preferredFontStyle: 'comic' },
        {
          appUserId: 'app-1',
          displayName: null,
          preferredLocale: null,
          preferredTheme: null,
          preferredFontStyle: 'system',
        },
      ),
    ).toMatchObject({ ok: false, code: 'invalid_input' });
  });
});
