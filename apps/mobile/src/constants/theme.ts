/** Calm, timeline-first palette from product guidelines. */
export const lightColors = {
  background: '#F7F5F2',
  surface: '#FFFFFF',
  text: '#1C1C1A',
  textMuted: '#6B6B66',
  accent: '#5C7C6A',
  border: '#E8E4DE',
  timelineDivider: '#D8D2C8',
  tabBarBorder: 'rgba(232, 228, 222, 0.4)',
  destructive: '#8A3A2B',
  shadow: '#1C1C1A',
} as const;

export const darkColors = {
  background: '#141413',
  surface: '#1E1E1C',
  text: '#F5F3EF',
  textMuted: '#A8A6A0',
  accent: '#7A9A88',
  border: '#2E2E2B',
  timelineDivider: '#3A3834',
  tabBarBorder: 'rgba(60, 58, 54, 0.55)',
  destructive: '#D48478',
  shadow: '#000000',
} as const;

export type ThemeColors = {
  readonly [K in keyof typeof lightColors]: string;
};

export type AppTheme = 'light' | 'dark';

export function getColorsForTheme(theme: AppTheme): ThemeColors {
  return theme === 'dark' ? darkColors : lightColors;
}

/** @deprecated Use `useThemeColors()` from `@/lib/appearance`. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
