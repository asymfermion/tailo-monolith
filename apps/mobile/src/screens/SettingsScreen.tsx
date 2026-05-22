import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFontFamilyForStyle } from '@/constants/typography';
import { spacing, type AppTheme } from '@/constants/theme';
import { setAppLocale, t, useAppLocale } from '@/i18n';
import {
  APP_FONT_STYLES,
  setAppFontStyle,
  useAppFontStyle,
  type AppFontStyle,
} from '@/lib/appFontStyle';
import { setAppTheme, useAppTheme } from '@/lib/appTheme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';

import { SettingsOptionPicker } from './settings/SettingsOptionPicker';

type SettingsRowProps = {
  description?: string;
  label: string;
  onPress?: () => void;
};

const FONT_STYLE_LABEL_KEYS: Record<AppFontStyle, string> = {
  system: 'settings.fontStyles.system',
  serif: 'settings.fontStyles.serif',
  rounded: 'settings.fontStyles.rounded',
  modern: 'settings.fontStyles.modern',
  elegant: 'settings.fontStyles.elegant',
};

function createSettingsStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.lg,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 28,
      fontWeight: '600' as const,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      textTransform: 'uppercase' as const,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden' as const,
    },
    row: {
      alignItems: 'center' as const,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row' as const,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rowPressed: {
      backgroundColor: colors.background,
    },
    rowInner: {
      flex: 1,
    },
    rowLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    rowDescription: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    chevron: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 22,
      lineHeight: 22,
      marginLeft: spacing.sm,
    },
  };
}

type SettingsStyles = ReturnType<typeof createSettingsStyles>;

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const tabBarContentInset = useTabBarContentInset();
  const locale = useAppLocale();
  const theme = useAppTheme();
  const fontStyle = useAppFontStyle();
  const styles = useThemedStyles(createSettingsStyles);

  const languageOptions = useMemo(
    () => [
      { value: 'en' as const, label: t('settings.languages.english') },
      {
        value: 'zh-Hans' as const,
        label: t('settings.languages.simplifiedChinese'),
      },
    ],
    [locale],
  );

  const themeOptions = useMemo(
    () => [
      { value: 'light' as AppTheme, label: t('settings.themes.light') },
      { value: 'dark' as AppTheme, label: t('settings.themes.dark') },
    ],
    [locale, theme],
  );

  const fontStyleOptions = useMemo(
    () =>
      APP_FONT_STYLES.map((value) => ({
        value,
        label: t(FONT_STYLE_LABEL_KEYS[value]),
        labelStyle: {
          fontFamily: getFontFamilyForStyle(value, '600'),
          fontSize: 16,
          fontWeight: '600' as const,
        },
      })),
    [locale],
  );

  const selectedFontLabelStyle = useMemo(
    () => ({
      fontFamily: getFontFamilyForStyle(fontStyle, '600'),
      fontSize: 16,
      fontWeight: '600' as const,
    }),
    [fontStyle],
  );

  const selectedLanguageLabel =
    locale === 'zh-Hans'
      ? t('settings.languages.simplifiedChinese')
      : t('settings.languages.english');

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: tabBarContentInset,
          paddingTop: getTabScreenTopPadding(insets.top),
        },
      ]}
      contentInsetAdjustmentBehavior="never"
      style={styles.screen}
    >
      <Text style={styles.title}>{t('navigation.tabs.Settings')}</Text>
      <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>

      <SettingsSection styles={styles} title={t('settings.sections.account')}>
        <SettingsRow
          description={t('settings.accountDescription')}
          label={t('settings.accountLabel')}
          styles={styles}
          onPress={() => navigation.push('AccountSettings')}
        />
      </SettingsSection>

      <SettingsSection
        styles={styles}
        title={t('settings.sections.localization')}
      >
        <SettingsOptionPicker
          accessibilityLabel={t('settings.languageLabel')}
          options={languageOptions}
          selectedLabel={selectedLanguageLabel}
          selectedValue={locale}
          onSelect={(value) => {
            void setAppLocale(value);
          }}
        />
      </SettingsSection>

      <SettingsSection styles={styles} title={t('settings.sections.theme')}>
        <SettingsOptionPicker
          accessibilityLabel={t('settings.themeLabel')}
          options={themeOptions}
          selectedLabel={
            theme === 'dark'
              ? t('settings.themes.dark')
              : t('settings.themes.light')
          }
          selectedValue={theme}
          onSelect={(value) => {
            void setAppTheme(value);
          }}
        />
      </SettingsSection>

      <SettingsSection styles={styles} title={t('settings.sections.fontStyle')}>
        <SettingsOptionPicker
          accessibilityLabel={t('settings.fontStyleLabel')}
          options={fontStyleOptions}
          selectedLabel={t(FONT_STYLE_LABEL_KEYS[fontStyle])}
          selectedLabelStyle={selectedFontLabelStyle}
          selectedValue={fontStyle}
          onSelect={(value) => {
            void setAppFontStyle(value);
          }}
        />
      </SettingsSection>

      <SettingsSection
        styles={styles}
        title={t('settings.sections.preferences')}
      >
        <SettingsRow
          description={t('settings.timelineScanDescription')}
          label={t('settings.timelineScanLabel')}
          styles={styles}
          onPress={() => navigation.setActiveTab('Timeline')}
        />
        <SettingsRow
          description={t('settings.petProfileDescription')}
          label={t('settings.petProfileLabel')}
          styles={styles}
          onPress={() => navigation.setActiveTab('PetProfile')}
        />
      </SettingsSection>
    </ScrollView>
  );
}

function SettingsSection({
  children,
  styles,
  title,
}: {
  children: ReactNode;
  styles: SettingsStyles;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  description,
  label,
  onPress,
  styles,
}: SettingsRowProps & {
  styles: SettingsStyles;
}) {
  const content = (
    <View style={styles.rowInner}>
      <Text style={styles.rowLabel}>{label}</Text>
      {description ? (
        <Text style={styles.rowDescription}>{description}</Text>
      ) : null}
    </View>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      {content}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}
