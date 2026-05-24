import { describe, expect, it } from 'vitest';

import {
  isGetAccountProfileResponse,
  normalizeRemoteAccountProfileSummary,
} from './get-account-profile';

describe('get-account-profile contracts', () => {
  it('accepts an empty profile response', () => {
    expect(isGetAccountProfileResponse({ profile: null })).toBe(true);
  });

  it('normalizes optional profile fields', () => {
    expect(
      normalizeRemoteAccountProfileSummary({
        app_user_id: 'app-1',
        display_name: 'Mochi',
        preferred_locale: 'en',
        preferred_theme: 'dark',
        preferred_font_style: 'rounded',
        updated_at: '2026-05-19T00:00:00.000Z',
      }),
    ).toEqual({
      app_user_id: 'app-1',
      display_name: 'Mochi',
      preferred_locale: 'en',
      preferred_theme: 'dark',
      preferred_font_style: 'rounded',
      updated_at: '2026-05-19T00:00:00.000Z',
    });
  });
});
