import { useSyncExternalStore } from 'react';

import { secureStorage } from '@/modules/auth/secureStorage';

export const APP_FONT_STYLES = [
  'system',
  'serif',
  'rounded',
  'modern',
  'elegant',
] as const;
export const DEFAULT_APP_FONT_STYLE = 'system' as const;
export const APP_FONT_STYLE_STORAGE_KEY = 'tailo.app_font_style';

export type AppFontStyle = (typeof APP_FONT_STYLES)[number];

let currentFontStyle: AppFontStyle = DEFAULT_APP_FONT_STYLE;
const listeners = new Set<() => void>();

export function isAppFontStyle(
  value: string | null | undefined,
): value is AppFontStyle {
  return APP_FONT_STYLES.includes(value as AppFontStyle);
}

export function getAppFontStyle(): AppFontStyle {
  return currentFontStyle;
}

function notifyFontStyleListeners() {
  listeners.forEach((listener) => listener());
}

function applyAppFontStyle(fontStyle: AppFontStyle): AppFontStyle {
  if (currentFontStyle === fontStyle) {
    return currentFontStyle;
  }

  currentFontStyle = fontStyle;
  notifyFontStyleListeners();
  return currentFontStyle;
}

export async function hydrateAppFontStyle(): Promise<AppFontStyle> {
  const storedFontStyle = await secureStorage.getItemAsync(
    APP_FONT_STYLE_STORAGE_KEY,
  );

  if (isAppFontStyle(storedFontStyle)) {
    return applyAppFontStyle(storedFontStyle);
  }

  return currentFontStyle;
}

export async function setAppFontStyle(
  fontStyle: AppFontStyle,
): Promise<AppFontStyle> {
  await secureStorage.setItemAsync(APP_FONT_STYLE_STORAGE_KEY, fontStyle);
  return applyAppFontStyle(fontStyle);
}

export function subscribeAppFontStyle(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useAppFontStyle(): AppFontStyle {
  return useSyncExternalStore(
    subscribeAppFontStyle,
    getAppFontStyle,
    () => DEFAULT_APP_FONT_STYLE,
  );
}
