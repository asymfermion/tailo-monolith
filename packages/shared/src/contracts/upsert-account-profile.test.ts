import { describe, expect, it } from 'vitest';

import {
  isUpsertAccountProfileResponse,
  normalizeUpsertAccountProfileResponse,
  parseUpsertAccountProfileRequest,
} from './upsert-account-profile';

describe('parseUpsertAccountProfileRequest', () => {
  it('parses display_name only', () => {
    expect(parseUpsertAccountProfileRequest({ display_name: 'Mochi' })).toEqual(
      {
        display_name: 'Mochi',
      },
    );
  });

  it('parses appearance preference fields', () => {
    expect(
      parseUpsertAccountProfileRequest({
        preferred_theme: 'dark',
        preferred_font_style: 'serif',
      }),
    ).toEqual({
      preferred_theme: 'dark',
      preferred_font_style: 'serif',
    });
  });

  it('rejects empty bodies', () => {
    expect(parseUpsertAccountProfileRequest({})).toBeNull();
    expect(parseUpsertAccountProfileRequest(null)).toBeNull();
  });

  it('rejects invalid field types', () => {
    expect(parseUpsertAccountProfileRequest({ preferred_theme: 1 })).toBeNull();
  });
});

describe('isUpsertAccountProfileResponse', () => {
  it('accepts valid responses', () => {
    expect(
      isUpsertAccountProfileResponse({
        app_user_id: 'app-1',
        display_name: 'Mochi',
        preferred_locale: 'en',
        preferred_theme: 'light',
        preferred_font_style: 'system',
        created: false,
        updated_at: '2026-05-19T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('accepts legacy responses without appearance preference fields', () => {
    expect(
      isUpsertAccountProfileResponse({
        app_user_id: 'app-1',
        display_name: 'Mochi',
        preferred_locale: 'en',
        created: false,
        updated_at: '2026-05-19T00:00:00.000Z',
      }),
    ).toBe(true);
  });
});

describe('normalizeUpsertAccountProfileResponse', () => {
  it('fills missing appearance fields with null', () => {
    expect(
      normalizeUpsertAccountProfileResponse({
        app_user_id: 'app-1',
        display_name: null,
        preferred_locale: 'en',
        created: true,
        updated_at: '2026-05-19T00:00:00.000Z',
      }),
    ).toEqual({
      app_user_id: 'app-1',
      display_name: null,
      preferred_locale: 'en',
      preferred_theme: null,
      preferred_font_style: null,
      notification_preferences: null,
      created: true,
      updated_at: '2026-05-19T00:00:00.000Z',
    });
  });
});
