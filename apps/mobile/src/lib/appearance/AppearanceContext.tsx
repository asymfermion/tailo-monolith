import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';

import {
  getColorsForTheme,
  type AppTheme,
  type ThemeColors,
} from '@/constants/theme';
import {
  getFontFamilies,
  getFontFamilyForStyle,
  type FontWeightName,
} from '@/constants/typography';
import { useAppFontStyle, type AppFontStyle } from '@/lib/appFontStyle';
import { useAppTheme } from '@/lib/appTheme';

export type AppearanceFonts = Record<FontWeightName, string | undefined>;

export type AppearanceContextValue = {
  theme: AppTheme;
  fontStyle: AppFontStyle;
  colors: ThemeColors;
  fonts: AppearanceFonts;
  statusBarStyle: 'light' | 'dark';
  getFontFamily: (fontWeight?: TextStyle['fontWeight']) => string | undefined;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const fontStyle = useAppFontStyle();

  const value = useMemo<AppearanceContextValue>(() => {
    const colors = getColorsForTheme(theme);
    const fonts = getFontFamilies(fontStyle);

    return {
      theme,
      fontStyle,
      colors,
      fonts,
      statusBarStyle: theme === 'dark' ? 'light' : 'dark',
      getFontFamily: (fontWeight?: TextStyle['fontWeight']) =>
        getFontFamilyForStyle(fontStyle, fontWeight),
    };
  }, [fontStyle, theme]);

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }

  return context;
}

export function useThemeColors(): ThemeColors {
  return useAppearance().colors;
}

type ThemedStyleFactory<T> = (appearance: AppearanceContextValue) => T;

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: ThemedStyleFactory<T>,
): T {
  const appearance = useAppearance();
  const { colors, fontStyle, theme } = appearance;

  return useMemo(
    () => StyleSheet.create(factory(appearance)),
    [appearance, colors, factory, fontStyle, theme],
  );
}
