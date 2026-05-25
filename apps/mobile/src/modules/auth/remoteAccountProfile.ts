import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import {
  getAppFontStyle,
  isAppFontStyle,
  setAppFontStyle,
  type AppFontStyle,
} from '@/lib/appFontStyle';
import { getAppTheme, isAppTheme, setAppTheme } from '@/lib/appTheme';
import type { AppTheme } from '@/constants/theme';
import { getAppLocale, setAppLocale, type AppLocale } from '@/i18n/locale';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';
import {
  loadLocalAccountProfile,
  saveLocalAccountProfile,
} from '@/modules/auth/localAccountProfile';
import { getAuthProvider } from '@/modules/auth/authProviderInstance';
import {
  isGetAccountProfileResponse,
  normalizeRemoteAccountProfileSummary,
  normalizeUpsertAccountProfileResponse,
  type RemoteAccountProfileSummary,
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

export type PullRemoteAccountProfileResult =
  | { status: 'skipped' }
  | { status: 'no_profile' }
  | { status: 'pulled'; profile: RemoteAccountProfile }
  | { status: 'error'; message: string };

type AccountProfileAppearance = {
  display_name: string | null;
  preferred_locale: string | null;
  preferred_theme: string | null;
  preferred_font_style: string | null;
};

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

function toRemoteAccountProfile(
  appUserId: string,
  snapshot: AccountProfileAppearance,
): RemoteAccountProfile {
  return {
    appUserId,
    displayName: snapshot.display_name,
    preferredLocale: parsePreferredLocale(snapshot.preferred_locale),
    preferredTheme: parsePreferredTheme(snapshot.preferred_theme),
    preferredFontStyle: parsePreferredFontStyle(snapshot.preferred_font_style),
  };
}

function hasNonEmptyText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function applyRemoteAccountProfile(
  snapshot: AccountProfileAppearance,
): Promise<void> {
  await saveLocalAccountProfile({
    displayName: snapshot.display_name ?? null,
  });

  const locale = parsePreferredLocale(snapshot.preferred_locale);

  if (locale) {
    await setAppLocale(locale);
  }

  const theme = parsePreferredTheme(snapshot.preferred_theme);

  if (theme) {
    await setAppTheme(theme);
  }

  const fontStyle = parsePreferredFontStyle(snapshot.preferred_font_style);

  if (fontStyle) {
    await setAppFontStyle(fontStyle);
  }
}

async function fetchRemoteAccountProfileSummary(): Promise<
  RemoteAccountProfileSummary | null | 'error'
> {
  const result = await invokeTailoApi('get-account-profile');

  if ('error' in result) {
    return 'error';
  }

  if (!result.ok) {
    return 'error';
  }

  if (!isGetAccountProfileResponse(result.payload)) {
    return 'error';
  }

  if (!result.payload.profile) {
    return null;
  }

  return normalizeRemoteAccountProfileSummary(result.payload.profile);
}

/**
 * Downloads the account profile from the server and applies it locally
 * (display name, locale, theme, font).
 */
export async function pullRemoteAccountProfileIfNeeded(): Promise<PullRemoteAccountProfileResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session?.appUserId || !isLinkedRemoteAccount(session)) {
    return { status: 'skipped' };
  }

  const summary = await fetchRemoteAccountProfileSummary();

  if (summary === 'error') {
    return {
      status: 'error',
      message: 'Could not load account profile from cloud.',
    };
  }

  if (!summary) {
    return { status: 'no_profile' };
  }

  await applyRemoteAccountProfile(summary);

  return {
    status: 'pulled',
    profile: toRemoteAccountProfile(session.appUserId, summary),
  };
}

/**
 * Pushes device-only preferences to the server when cloud fields are still empty
 * (e.g. first account link on the device that created the data).
 */
export async function seedLocalAccountPrefsToCloudIfEmpty(): Promise<SyncRemoteAccountProfileResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session || !isLinkedRemoteAccount(session)) {
    return { status: 'not_linked' };
  }

  const summary = await fetchRemoteAccountProfileSummary();
  const localProfile = await loadLocalAccountProfile();
  const patch: SyncRemoteAccountProfilePatch = {};

  if (summary === 'error') {
    return {
      status: 'error',
      message: 'Could not read account profile before seeding.',
    };
  }

  const cloud = summary ?? {
    display_name: null,
    preferred_locale: null,
    preferred_theme: null,
    preferred_font_style: null,
  };

  const cloudDisplayNameMissing = !hasNonEmptyText(cloud.display_name);
  const localDisplayNameMissing = !hasNonEmptyText(localProfile?.displayName);

  if (cloudDisplayNameMissing && !localDisplayNameMissing) {
    patch.displayName = localProfile?.displayName ?? null;
  }

  if (cloudDisplayNameMissing && !patch.displayName) {
    const identityDisplayName =
      (await getAuthProvider().getIdentityDisplayName?.()) ?? null;

    if (identityDisplayName) {
      patch.displayName = identityDisplayName;
    }
  }

  if (cloud.preferred_locale == null) {
    patch.preferredLocale = getAppLocale();
  }

  if (cloud.preferred_theme == null) {
    patch.preferredTheme = getAppTheme();
  }

  if (cloud.preferred_font_style == null) {
    patch.preferredFontStyle = getAppFontStyle();
  }

  if (Object.keys(patch).length === 0) {
    return { status: 'skipped' };
  }

  return syncRemoteAccountProfile(patch);
}

export async function fetchRemoteAccountProfile(): Promise<RemoteAccountProfile | null> {
  if (!isRemoteAuthConfigured()) {
    return null;
  }

  const session = await getAuthSession();

  if (!session?.appUserId || !isLinkedRemoteAccount(session)) {
    return null;
  }

  const summary = await fetchRemoteAccountProfileSummary();

  if (summary === 'error') {
    return null;
  }

  if (!summary) {
    const localProfile = await loadLocalAccountProfile();

    return {
      appUserId: session.appUserId,
      displayName: localProfile?.displayName ?? null,
      preferredLocale: getAppLocale(),
      preferredTheme: getAppTheme(),
      preferredFontStyle: getAppFontStyle(),
    };
  }

  await applyRemoteAccountProfile(summary);

  return toRemoteAccountProfile(session.appUserId, summary);
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

    await applyRemoteAccountProfile(response);

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
