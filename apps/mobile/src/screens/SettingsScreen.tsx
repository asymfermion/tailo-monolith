import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFontFamilyForStyle } from '@/constants/typography';
import { spacing, type AppTheme } from '@/constants/theme';
import { t, useAppLocale, type AppLocale } from '@/i18n';
import {
  APP_FONT_STYLES,
  useAppFontStyle,
  type AppFontStyle,
} from '@/lib/appFontStyle';
import { useAppTheme } from '@/lib/appTheme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';
import {
  formatAccountSettingsLabel,
  logoutRemoteAccount,
  setAppFontStyleAndSyncProfile,
  setAppLocaleAndSyncProfile,
  setAppThemeAndSyncProfile,
  type PersistAppPreferenceResult,
  useAuthAccountStatus,
  useAuthGate,
  useRemoteAccountProfile,
} from '@/modules/auth';

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
      flexGrow: 1,
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
    rowLast: {
      borderBottomWidth: 0,
    },
    logoutFooter: {
      marginTop: 'auto' as const,
      paddingTop: spacing.xl,
    },
    logoutButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center' as const,
      minHeight: 48,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    logoutButtonPressed: {
      backgroundColor: colors.background,
    },
    logoutButtonDisabled: {
      opacity: 0.6,
    },
    logoutButtonText: {
      color: colors.destructive,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
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
  const account = useAuthAccountStatus();
  const { profile: accountProfile, refresh: refreshAccountProfile } =
    useRemoteAccountProfile();
  const authGate = useAuthGate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const styles = useThemedStyles(createSettingsStyles);
  const showLogout = account.isConfigured && account.isLinked;

  useEffect(() => {
    if (navigation.activeTab !== 'Settings') {
      return;
    }

    void refreshAccountProfile();
  }, [
    navigation.activeTab,
    navigation.modalStack.length,
    refreshAccountProfile,
  ]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logoutLabel'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsLoggingOut(true);
              const result = await logoutRemoteAccount();
              await authGate.refresh();
              await account.refresh();
              setIsLoggingOut(false);

              if (result.status === 'error') {
                Alert.alert(
                  t('settings.logoutFailedTitle'),
                  result.message || t('settings.logoutFailedMessage'),
                );
              }
            })();
          },
        },
      ],
    );
  }, [account, authGate]);

  const shouldSyncProfile =
    account.isConfigured && !account.isLoading && account.isLinked;

  const handlePreferenceSyncResult = useCallback(
    async (result: PersistAppPreferenceResult) => {
      if (result.status === 'synced') {
        await refreshAccountProfile();
        return;
      }

      if (result.status === 'error') {
        Alert.alert(
          t('settings.preferenceSyncFailedTitle'),
          result.message || t('settings.preferenceSyncFailedMessage'),
        );
      }
    },
    [refreshAccountProfile],
  );

  const handleLanguageSelect = useCallback(
    (value: AppLocale) => {
      void (async () => {
        const result = await setAppLocaleAndSyncProfile(value, {
          syncToRemoteProfile: shouldSyncProfile,
        });
        await handlePreferenceSyncResult(result);
      })();
    },
    [handlePreferenceSyncResult, shouldSyncProfile],
  );

  const handleThemeSelect = useCallback(
    (value: AppTheme) => {
      void (async () => {
        const result = await setAppThemeAndSyncProfile(value, {
          syncToRemoteProfile: shouldSyncProfile,
        });
        await handlePreferenceSyncResult(result);
      })();
    },
    [handlePreferenceSyncResult, shouldSyncProfile],
  );

  const handleFontStyleSelect = useCallback(
    (value: AppFontStyle) => {
      void (async () => {
        const result = await setAppFontStyleAndSyncProfile(value, {
          syncToRemoteProfile: shouldSyncProfile,
        });
        await handlePreferenceSyncResult(result);
      })();
    },
    [handlePreferenceSyncResult, shouldSyncProfile],
  );

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

  const profileDisplayName = accountProfile?.displayName?.trim() ?? '';
  const accountEmail = account.session?.email ?? null;

  const accountLabel = useMemo(() => {
    if (account.isLoading) {
      return t('settings.accountLoadingLabel');
    }

    if (!account.isLinked) {
      return t('userProfile.settingsRowLabel');
    }

    if (profileDisplayName) {
      return profileDisplayName;
    }

    const emailLabel = formatAccountSettingsLabel({
      session: account.session,
      displayName: null,
    });

    return emailLabel || t('userProfile.settingsRowLabel');
  }, [
    account.isLoading,
    account.isLinked,
    account.session,
    profileDisplayName,
  ]);

  const accountDescription = useMemo(() => {
    if (account.isLoading) {
      return t('settings.accountLoadingDescription');
    }

    if (!account.isLinked) {
      return t('userProfile.settingsRowDescriptionAnonymous');
    }

    if (profileDisplayName && accountEmail) {
      return accountEmail;
    }

    return t('userProfile.settingsRowDescriptionLinked');
  }, [account.isLoading, account.isLinked, accountEmail, profileDisplayName]);

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

      <SettingsSection
        styles={styles}
        title={t('userProfile.settingsSectionTitle')}
      >
        <SettingsRow
          description={accountDescription}
          label={accountLabel}
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
          onSelect={handleLanguageSelect}
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
          onSelect={handleThemeSelect}
        />
      </SettingsSection>

      <SettingsSection styles={styles} title={t('settings.sections.fontStyle')}>
        <SettingsOptionPicker
          accessibilityLabel={t('settings.fontStyleLabel')}
          options={fontStyleOptions}
          selectedLabel={t(FONT_STYLE_LABEL_KEYS[fontStyle])}
          selectedLabelStyle={selectedFontLabelStyle}
          selectedValue={fontStyle}
          onSelect={handleFontStyleSelect}
        />
      </SettingsSection>

      {showLogout ? (
        <View style={styles.logoutFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoggingOut }}
            disabled={isLoggingOut}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
              isLoggingOut && styles.logoutButtonDisabled,
            ]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>
              {t('settings.logoutLabel')}
            </Text>
          </Pressable>
        </View>
      ) : null}
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
  isLast = false,
  label,
  onPress,
  styles,
}: SettingsRowProps & {
  isLast?: boolean;
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
    return (
      <View style={[styles.row, isLast && styles.rowLast]}>{content}</View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        isLast && styles.rowLast,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
    >
      {content}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}
