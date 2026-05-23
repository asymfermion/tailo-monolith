export const ACCOUNT_PROFILE_DISPLAY_NAME_MAX = 80;

export const SUPPORTED_ACCOUNT_LOCALES = ['en', 'zh-Hans'] as const;
export const SUPPORTED_ACCOUNT_THEMES = ['light', 'dark'] as const;
export const SUPPORTED_ACCOUNT_FONT_STYLES = [
  'system',
  'serif',
  'rounded',
  'modern',
  'elegant',
] as const;

export type AccountProfileRow = {
  appUserId: string;
  displayName: string | null;
  preferredLocale: string | null;
  preferredTheme: string | null;
  preferredFontStyle: string | null;
};

export type UpsertAccountProfileInput = {
  callerAppUserId: string;
  displayName?: string | null;
  preferredLocale?: string | null;
  preferredTheme?: string | null;
  preferredFontStyle?: string | null;
};

export type UpsertAccountProfileSuccess = {
  ok: true;
  appUserId: string;
  displayName: string | null;
  preferredLocale: string | null;
  preferredTheme: string | null;
  preferredFontStyle: string | null;
  created: boolean;
};

export type UpsertAccountProfileFailure = {
  ok: false;
  code: 'invalid_input';
  message: string;
};

export type UpsertAccountProfileResult =
  | UpsertAccountProfileSuccess
  | UpsertAccountProfileFailure;

function normalizeDisplayName(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalString(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function resolveUpsertAccountProfile(
  input: UpsertAccountProfileInput,
  existing: AccountProfileRow | null,
): UpsertAccountProfileResult {
  const hasDisplayName = 'displayName' in input;
  const hasPreferredLocale = 'preferredLocale' in input;
  const hasPreferredTheme = 'preferredTheme' in input;
  const hasPreferredFontStyle = 'preferredFontStyle' in input;

  if (
    !hasDisplayName &&
    !hasPreferredLocale &&
    !hasPreferredTheme &&
    !hasPreferredFontStyle
  ) {
    return {
      ok: false,
      code: 'invalid_input',
      message:
        'Provide display_name, preferred_locale, preferred_theme, and/or preferred_font_style to update.',
    };
  }

  let displayName = existing?.displayName ?? null;
  let preferredLocale = existing?.preferredLocale ?? null;
  let preferredTheme = existing?.preferredTheme ?? null;
  let preferredFontStyle = existing?.preferredFontStyle ?? null;

  if (hasDisplayName) {
    displayName = normalizeDisplayName(input.displayName);

    if (displayName && displayName.length > ACCOUNT_PROFILE_DISPLAY_NAME_MAX) {
      return {
        ok: false,
        code: 'invalid_input',
        message: `Display name must be ${ACCOUNT_PROFILE_DISPLAY_NAME_MAX} characters or fewer.`,
      };
    }
  }

  if (hasPreferredLocale) {
    preferredLocale = normalizeOptionalString(input.preferredLocale);

    if (
      preferredLocale &&
      !SUPPORTED_ACCOUNT_LOCALES.includes(
        preferredLocale as (typeof SUPPORTED_ACCOUNT_LOCALES)[number],
      )
    ) {
      return {
        ok: false,
        code: 'invalid_input',
        message: 'preferred_locale is not supported.',
      };
    }
  }

  if (hasPreferredTheme) {
    preferredTheme = normalizeOptionalString(input.preferredTheme);

    if (
      preferredTheme &&
      !SUPPORTED_ACCOUNT_THEMES.includes(
        preferredTheme as (typeof SUPPORTED_ACCOUNT_THEMES)[number],
      )
    ) {
      return {
        ok: false,
        code: 'invalid_input',
        message: 'preferred_theme is not supported.',
      };
    }
  }

  if (hasPreferredFontStyle) {
    preferredFontStyle = normalizeOptionalString(input.preferredFontStyle);

    if (
      preferredFontStyle &&
      !SUPPORTED_ACCOUNT_FONT_STYLES.includes(
        preferredFontStyle as (typeof SUPPORTED_ACCOUNT_FONT_STYLES)[number],
      )
    ) {
      return {
        ok: false,
        code: 'invalid_input',
        message: 'preferred_font_style is not supported.',
      };
    }
  }

  return {
    ok: true,
    appUserId: input.callerAppUserId,
    displayName,
    preferredLocale,
    preferredTheme,
    preferredFontStyle,
    created: !existing,
  };
}
