import {
  resolveUpsertAccountProfile,
  type UpsertAccountProfileInput,
} from '../../../../packages/backend-core/src/usecases/upsertAccountProfile.ts';
import {
  isUpsertAccountProfileResponse,
  parseUpsertAccountProfileRequest,
} from '../../../../packages/shared/src/contracts/upsert-account-profile.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

export const handleUpsertAccountProfile: ApiHandler = async ({
  user,
  log,
  payload,
}) => {
  const body = parseUpsertAccountProfileRequest(payload);

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  const { data: existingRow, error: lookupError } = await adminClient
    .from('account_profiles')
    .select(
      'app_user_id, display_name, preferred_locale, preferred_theme, preferred_font_style, notification_preferences',
    )
    .eq('app_user_id', appUser.appUserId)
    .maybeSingle();

  if (lookupError) {
    return jsonResponse({ error: lookupError.message }, 500);
  }

  const input: UpsertAccountProfileInput = {
    callerAppUserId: appUser.appUserId,
  };

  if (body.display_name !== undefined) {
    input.displayName = body.display_name;
  }

  if (body.preferred_locale !== undefined) {
    input.preferredLocale = body.preferred_locale;
  }

  if (body.preferred_theme !== undefined) {
    input.preferredTheme = body.preferred_theme;
  }

  if (body.preferred_font_style !== undefined) {
    input.preferredFontStyle = body.preferred_font_style;
  }

  if (body.notification_preferences !== undefined) {
    input.notificationPreferences = body.notification_preferences;
  }

  const decision = resolveUpsertAccountProfile(
    input,
    existingRow
      ? {
          appUserId: existingRow.app_user_id,
          displayName: existingRow.display_name,
          preferredLocale: existingRow.preferred_locale,
          preferredTheme: existingRow.preferred_theme,
          preferredFontStyle: existingRow.preferred_font_style,
          notificationPreferences: existingRow.notification_preferences,
        }
      : null,
  );

  if (!decision.ok) {
    return jsonResponse({ error: decision.message, code: decision.code }, 400);
  }

  const now = new Date().toISOString();

  const { error: upsertError } = await adminClient
    .from('account_profiles')
    .upsert(
      {
        app_user_id: decision.appUserId,
        display_name: decision.displayName,
        preferred_locale: decision.preferredLocale,
        preferred_theme: decision.preferredTheme,
        preferred_font_style: decision.preferredFontStyle,
        notification_preferences: decision.notificationPreferences,
        updated_at: now,
      },
      { onConflict: 'app_user_id' },
    );

  if (upsertError) {
    return jsonResponse({ error: upsertError.message }, 500);
  }

  log.info('upsert_account_profile_ok', {
    appUserId: decision.appUserId,
    created: decision.created,
  });

  const responseBody = {
    app_user_id: decision.appUserId,
    display_name: decision.displayName,
    preferred_locale: decision.preferredLocale,
    preferred_theme: decision.preferredTheme,
    preferred_font_style: decision.preferredFontStyle,
    notification_preferences: decision.notificationPreferences,
    created: decision.created,
    updated_at: now,
  };

  if (!isUpsertAccountProfileResponse(responseBody)) {
    return jsonResponse({ error: 'Invalid profile response.' }, 500);
  }

  return jsonResponse(responseBody);
};
