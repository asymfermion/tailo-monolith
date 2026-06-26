import {
  isGetAccountProfileResponse,
  normalizeRemoteAccountProfileSummary,
  type GetAccountProfileResponse,
} from '../../../../packages/shared/src/contracts/get-account-profile.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

export const handleGetAccountProfile: ApiHandler = async ({ user, log }) => {
  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  const { data: row, error } = await adminClient
    .from('account_profiles')
    .select(
      'app_user_id, display_name, preferred_locale, preferred_theme, preferred_font_style, notification_preferences, updated_at',
    )
    .eq('app_user_id', appUser.appUserId)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  if (!row) {
    log.info('get_account_profile_empty', { appUserId: appUser.appUserId });
    return jsonResponse({ profile: null } satisfies GetAccountProfileResponse);
  }

  const profile = normalizeRemoteAccountProfileSummary({
    app_user_id: row.app_user_id,
    display_name: row.display_name,
    preferred_locale: row.preferred_locale,
    preferred_theme: row.preferred_theme,
    preferred_font_style: row.preferred_font_style,
    notification_preferences: row.notification_preferences,
    updated_at: row.updated_at,
  });

  log.info('get_account_profile_ok', { appUserId: appUser.appUserId });

  const responseBody = { profile } satisfies GetAccountProfileResponse;

  if (!isGetAccountProfileResponse(responseBody)) {
    return jsonResponse({ error: 'Invalid profile response.' }, 500);
  }

  return jsonResponse(responseBody);
};
