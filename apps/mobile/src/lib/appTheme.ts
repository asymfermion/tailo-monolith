import { useSyncExternalStore } from 'react';

import type { AppTheme } from '@/constants/theme';
import { secureStorage } from '@/modules/auth/secureStorage';

export const APP_THEMES = ['light', 'dark'] as const;
export const DEFAULT_APP_THEME: AppTheme = 'light';
export const APP_THEME_STORAGE_KEY = 'tailo.app_theme';

let currentTheme: AppTheme = DEFAULT_APP_THEME;
const listeners = new Set<() => void>();

export function isAppTheme(
  value: string | null | undefined,
): value is AppTheme {
  return value === 'light' || value === 'dark';
}

export function getAppTheme(): AppTheme {
  return currentTheme;
}

function notifyThemeListeners() {
  listeners.forEach((listener) => listener());
}

function applyAppTheme(theme: AppTheme): AppTheme {
  if (currentTheme === theme) {
    return currentTheme;
  }

  currentTheme = theme;
  notifyThemeListeners();
  return currentTheme;
}

export async function hydrateAppTheme(): Promise<AppTheme> {
  const storedTheme = await secureStorage.getItemAsync(APP_THEME_STORAGE_KEY);

  if (isAppTheme(storedTheme)) {
    return applyAppTheme(storedTheme);
  }

  return currentTheme;
}

export async function setAppTheme(theme: AppTheme): Promise<AppTheme> {
  await secureStorage.setItemAsync(APP_THEME_STORAGE_KEY, theme);
  return applyAppTheme(theme);
}

export function subscribeAppTheme(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useAppTheme(): AppTheme {
  return useSyncExternalStore(
    subscribeAppTheme,
    getAppTheme,
    () => DEFAULT_APP_THEME,
  );
}
