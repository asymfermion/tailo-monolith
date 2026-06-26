/** Account profile row for the signed-in user (`api-account` action `get-account-profile`). */
export type RemoteAccountProfileSummary = {
  app_user_id: string;
  display_name: string | null;
  preferred_locale: string | null;
  preferred_theme: string | null;
  preferred_font_style: string | null;
  notification_preferences: string | null;
  updated_at: string;
};

export type GetAccountProfileResponse = {
  profile: RemoteAccountProfileSummary | null;
};

function isOptionalStringField(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

export function isRemoteAccountProfileSummary(
  value: unknown,
): value is RemoteAccountProfileSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof Reflect.get(value, 'app_user_id') === 'string' &&
    typeof Reflect.get(value, 'updated_at') === 'string' &&
    isOptionalStringField(Reflect.get(value, 'display_name')) &&
    isOptionalStringField(Reflect.get(value, 'preferred_locale')) &&
    isOptionalStringField(Reflect.get(value, 'preferred_theme')) &&
    isOptionalStringField(Reflect.get(value, 'preferred_font_style')) &&
    isOptionalStringField(Reflect.get(value, 'notification_preferences'))
  );
}

export function isGetAccountProfileResponse(
  value: unknown,
): value is GetAccountProfileResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = Reflect.get(value, 'profile');

  return profile === null || isRemoteAccountProfileSummary(profile);
}

export function normalizeRemoteAccountProfileSummary(
  value: RemoteAccountProfileSummary,
): RemoteAccountProfileSummary {
  return {
    app_user_id: value.app_user_id,
    display_name: value.display_name ?? null,
    preferred_locale: value.preferred_locale ?? null,
    preferred_theme: value.preferred_theme ?? null,
    preferred_font_style: value.preferred_font_style ?? null,
    notification_preferences: value.notification_preferences ?? null,
    updated_at: value.updated_at,
  };
}
