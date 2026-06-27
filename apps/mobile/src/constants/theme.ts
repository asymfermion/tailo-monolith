/** Warm, photo-first palette derived from the UI sketches. */
export const lightColors = {
  background: '#FBF7F1',
  surface: '#FFFDF9',
  text: '#151412',
  textMuted: '#6F665D',
  accent: '#151412',
  border: '#E7DDD2',
  timelineDivider: '#D8CBBE',
  tabBarBorder: 'rgba(231, 221, 210, 0.52)',
  destructive: '#9A3E32',
  positive: '#34C759',
  shadow: '#151412',
} as const;

export const darkColors = {
  background: '#141413',
  surface: '#1E1E1C',
  text: '#F5F3EF',
  textMuted: '#B5ACA2',
  accent: '#F6EFE7',
  border: '#332F2A',
  timelineDivider: '#413A33',
  tabBarBorder: 'rgba(82, 74, 66, 0.58)',
  destructive: '#DA8A7E',
  positive: '#30D158',
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
