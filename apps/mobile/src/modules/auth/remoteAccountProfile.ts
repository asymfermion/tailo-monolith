import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import {
  getAppFontStyle,
  isAppFontStyle,
  setAppFontStyle,
  type AppFontStyle,
} from '@/lib/appFontStyle';
import {
  getAppTheme,
  isAppTheme,
  setAppTheme,
  type AppTheme,
} from '@/lib/appTheme';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getAppLocale, setAppLocale, type AppLocale } from '@/i18n/locale';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';
import { saveLocalAccountProfile } from '@/modules/auth/localAccountProfile';
import {
  normalizeUpsertAccountProfileResponse,
  type UpsertAccountProfileResponse,
} from '@tailo/shared';

export type RemoteAccountProfile = {
  appUserId: string;
  displayName: string | null;
  preferredLocale: AppLocale | null;
  preferredTheme: AppTheme | null;
  preferredFontStyle: AppFontStyle | null;
};

export type SyncRemoteAccountProfilePatch = {
  displayName?: string | null;
  preferredLocale?: AppLocale | null;
  preferredTheme?: AppTheme | null;
  preferredFontStyle?: AppFontStyle | null;
};

export type SyncRemoteAccountProfileResult =
  | { status: 'skipped' }
  | { status: 'not_linked' }
  | { status: 'synced'; response: UpsertAccountProfileResponse }
  | { status: 'error'; message: string };

function parsePreferredLocale(value: string | null): AppLocale | null {
  if (value === 'en' || value === 'zh-Hans') {
    return value;
  }

  return null;
}

function parsePreferredTheme(value: string | null): AppTheme | null {
  return isAppTheme(value) ? value : null;
}

function parsePreferredFontStyle(value: string | null): AppFontStyle | null {
  return isAppFontStyle(value) ? value : null;
}

async function applyRemoteProfileFromServer(
  payload: UpsertAccountProfileResponse,
): Promise<void> {
  await saveLocalAccountProfile({
    displayName: payload.display_name ?? null,
  });

  const locale = parsePreferredLocale(payload.preferred_locale);

  if (locale) {
    await setAppLocale(locale);
  }

  const theme = parsePreferredTheme(payload.preferred_theme);

  if (theme) {
    await setAppTheme(theme);
  }

  const fontStyle = parsePreferredFontStyle(payload.preferred_font_style);

  if (fontStyle) {
    await setAppFontStyle(fontStyle);
  }
}

export async function fetchRemoteAccountProfile(): Promise<RemoteAccountProfile | null> {
  if (!isRemoteAuthConfigured() || !isSupabaseConfigured()) {
    return null;
  }

  const session = await getAuthSession();

  if (!session?.appUserId || !isLinkedRemoteAccount(session)) {
    return null;
  }

  const { data, error } = await getSupabaseClient()
    .from('account_profiles')
    .select(
      'app_user_id, display_name, preferred_locale, preferred_theme, preferred_font_style',
    )
    .eq('app_user_id', session.appUserId)
    .maybeSingle();

  if (error || !data) {
    return {
      appUserId: session.appUserId,
      displayName: null,
      preferredLocale: getAppLocale(),
      preferredTheme: getAppTheme(),
      preferredFontStyle: getAppFontStyle(),
    };
  }

  const profile: RemoteAccountProfile = {
    appUserId: data.app_user_id,
    displayName: data.display_name,
    preferredLocale:
      parsePreferredLocale(data.preferred_locale) ?? getAppLocale(),
    preferredTheme: parsePreferredTheme(data.preferred_theme) ?? getAppTheme(),
    preferredFontStyle:
      parsePreferredFontStyle(data.preferred_font_style) ?? getAppFontStyle(),
  };

  await saveLocalAccountProfile({
    displayName: profile.displayName,
  });

  return profile;
}

export async function loadRemoteAccountProfile(): Promise<RemoteAccountProfile | null> {
  return fetchRemoteAccountProfile();
}

export async function syncRemoteAccountProfile(
  patch: SyncRemoteAccountProfilePatch,
): Promise<SyncRemoteAccountProfileResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session || !isLinkedRemoteAccount(session)) {
    return { status: 'not_linked' };
  }

  const body: Record<string, string | null> = {};

  if ('displayName' in patch) {
    body.display_name = patch.displayName ?? null;
  }

  if ('preferredLocale' in patch) {
    body.preferred_locale = patch.preferredLocale ?? null;
  }

  if ('preferredTheme' in patch) {
    body.preferred_theme = patch.preferredTheme ?? null;
  }

  if ('preferredFontStyle' in patch) {
    body.preferred_font_style = patch.preferredFontStyle ?? null;
  }

  if (Object.keys(body).length === 0) {
    return { status: 'skipped' };
  }

  try {
    const result = await invokeTailoApi('upsert-account-profile', body);

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          `Account profile sync failed (${status}).`,
        ),
      };
    }

    const response = normalizeUpsertAccountProfileResponse(payload);

    if (!response) {
      return {
        status: 'error',
        message: 'Invalid account profile response from server.',
      };
    }

    await applyRemoteProfileFromServer(response);

    return { status: 'synced', response };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Could not update account profile.',
    };
  }
}
