import type { AppLocale } from '@/i18n/locale';
import type { AppFontStyle } from '@/lib/appFontStyle';
import type { AppTheme } from '@/constants/theme';

import { isRequiredTextReady } from './authFormReadiness';

export type AccountProfileDraft = {
  displayName: string;
  preferredLocale: AppLocale;
  preferredTheme: AppTheme;
  preferredFontStyle: AppFontStyle;
};

export type SavedAccountProfile = {
  displayName: string | null;
  preferredLocale: AppLocale | null;
  preferredTheme: AppTheme | null;
  preferredFontStyle: AppFontStyle | null;
};

export function normalizeAccountProfileDisplayName(
  value: string | null | undefined,
): string | null {
  const trimmed = (value ?? '').trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function isAccountProfileDisplayNameChanged(
  draftDisplayName: string,
  savedDisplayName: string | null | undefined,
): boolean {
  return (
    normalizeAccountProfileDisplayName(draftDisplayName) !==
    normalizeAccountProfileDisplayName(savedDisplayName)
  );
}

export function hasAccountProfileDraftChanges(
  draft: AccountProfileDraft,
  saved: SavedAccountProfile | null,
): boolean {
  if (!saved) {
    return false;
  }

  if (
    isAccountProfileDisplayNameChanged(draft.displayName, saved.displayName)
  ) {
    return true;
  }

  if (draft.preferredLocale !== saved.preferredLocale) {
    return true;
  }

  if (draft.preferredTheme !== saved.preferredTheme) {
    return true;
  }

  return draft.preferredFontStyle !== saved.preferredFontStyle;
}

export function canSaveAccountProfileDraft(
  draft: AccountProfileDraft,
  saved: SavedAccountProfile | null,
): boolean {
  if (!hasAccountProfileDraftChanges(draft, saved)) {
    return false;
  }

  if (
    isAccountProfileDisplayNameChanged(draft.displayName, saved?.displayName)
  ) {
    return isRequiredTextReady(draft.displayName);
  }

  return true;
}
