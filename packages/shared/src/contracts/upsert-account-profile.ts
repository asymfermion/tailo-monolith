/** Payload for `api-account` action `upsert-account-profile` */
export type UpsertAccountProfileRequest = {
  display_name?: string | null;
  preferred_locale?: string | null;
  preferred_theme?: string | null;
  preferred_font_style?: string | null;
};

/** Success response from upsert-account-profile */
export type UpsertAccountProfileResponse = {
  app_user_id: string;
  display_name: string | null;
  preferred_locale: string | null;
  preferred_theme: string | null;
  preferred_font_style: string | null;
  created: boolean;
  updated_at: string;
};

function readOptionalStringField(
  body: object,
  key: keyof UpsertAccountProfileRequest,
): string | null | undefined {
  if (!(key in body)) {
    return undefined;
  }

  const value = Reflect.get(body, key);

  if (value !== null && typeof value !== 'string') {
    return null;
  }

  return value;
}

export function parseUpsertAccountProfileRequest(
  body: unknown,
): UpsertAccountProfileRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const displayName = readOptionalStringField(body, 'display_name');
  const preferredLocale = readOptionalStringField(body, 'preferred_locale');
  const preferredTheme = readOptionalStringField(body, 'preferred_theme');
  const preferredFontStyle = readOptionalStringField(
    body,
    'preferred_font_style',
  );

  if (
    displayName === null ||
    preferredLocale === null ||
    preferredTheme === null ||
    preferredFontStyle === null
  ) {
    return null;
  }

  const hasDisplayName = displayName !== undefined;
  const hasPreferredLocale = preferredLocale !== undefined;
  const hasPreferredTheme = preferredTheme !== undefined;
  const hasPreferredFontStyle = preferredFontStyle !== undefined;

  if (
    !hasDisplayName &&
    !hasPreferredLocale &&
    !hasPreferredTheme &&
    !hasPreferredFontStyle
  ) {
    return null;
  }

  const request: UpsertAccountProfileRequest = {};

  if (hasDisplayName) {
    request.display_name = displayName;
  }

  if (hasPreferredLocale) {
    request.preferred_locale = preferredLocale;
  }

  if (hasPreferredTheme) {
    request.preferred_theme = preferredTheme;
  }

  if (hasPreferredFontStyle) {
    request.preferred_font_style = preferredFontStyle;
  }

  return request;
}

function isOptionalStringField(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

export function isUpsertAccountProfileResponse(
  value: unknown,
): value is UpsertAccountProfileResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (
    typeof Reflect.get(value, 'app_user_id') !== 'string' ||
    typeof Reflect.get(value, 'created') !== 'boolean' ||
    typeof Reflect.get(value, 'updated_at') !== 'string'
  ) {
    return false;
  }

  if (
    !isOptionalStringField(Reflect.get(value, 'display_name')) ||
    !isOptionalStringField(Reflect.get(value, 'preferred_locale')) ||
    !isOptionalStringField(Reflect.get(value, 'preferred_theme')) ||
    !isOptionalStringField(Reflect.get(value, 'preferred_font_style'))
  ) {
    return false;
  }

  return true;
}

/** Normalizes API payloads that omit newer optional appearance fields. */
export function normalizeUpsertAccountProfileResponse(
  value: unknown,
): UpsertAccountProfileResponse | null {
  if (!isUpsertAccountProfileResponse(value)) {
    return null;
  }

  return {
    app_user_id: Reflect.get(value, 'app_user_id') as string,
    display_name: (Reflect.get(value, 'display_name') as string | null) ?? null,
    preferred_locale:
      (Reflect.get(value, 'preferred_locale') as string | null) ?? null,
    preferred_theme:
      (Reflect.get(value, 'preferred_theme') as string | null) ?? null,
    preferred_font_style:
      (Reflect.get(value, 'preferred_font_style') as string | null) ?? null,
    created: Reflect.get(value, 'created') as boolean,
    updated_at: Reflect.get(value, 'updated_at') as string,
  };
}
