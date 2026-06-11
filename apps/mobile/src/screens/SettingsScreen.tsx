import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDatabase } from '@/db';
import { getFontFamilyForStyle } from '@/constants/typography';
import { spacing, type AppTheme } from '@/constants/theme';
import { t, useAppLocale, type AppLocale } from '@/i18n';
import {
  APP_FONT_STYLES,
  useAppFontStyle,
  type AppFontStyle,
} from '@/lib/appFontStyle';
import { useAppTheme } from '@/lib/appTheme';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { appEnv } from '@/lib/env';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';
import {
  formatAccountSettingsLabel,
  logoutRemoteAccount,
  resetLocalDeviceData,
  setAppFontStyleAndSyncProfile,
  setAppLocaleAndSyncProfile,
  setAppThemeAndSyncProfile,
  type PersistAppPreferenceResult,
  useAuthAccountStatus,
  useAuthGate,
  useRemoteAccountProfile,
} from '@/modules/auth';
import { useUnreadNotificationsCount } from '@/modules/notifications';
import {
  runCloudSyncPass,
  setCloudImageUploadsEnabled,
  useCloudImageUploadsEnabled,
} from '@/modules/sync';

import { SettingsOptionPicker } from './settings/SettingsOptionPicker';

type SettingsRowProps = {
  description?: string;
  detail?: string;
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
      flexShrink: 1,
      minWidth: 0,
    },
    rowLabel: {
      color: colors.text,
      flexShrink: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    rowDescription: {
      color: colors.textMuted,
      flexShrink: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    rowDetailBadge: {
      alignSelf: 'flex-start' as const,
      backgroundColor: colors.accent,
      borderRadius: 999,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    rowDetailText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
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
    toggleControl: {
      marginLeft: spacing.md,
    },
    toggleLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 13,
      fontWeight: '600' as const,
      marginLeft: spacing.sm,
      minWidth: 28,
      textAlign: 'right' as const,
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
  const { colors } = useAppearance();
  const locale = useAppLocale();
  const theme = useAppTheme();
  const fontStyle = useAppFontStyle();
  const cloudImageUploadsEnabled = useCloudImageUploadsEnabled();
  const account = useAuthAccountStatus();
  const { profile: accountProfile, refresh: refreshAccountProfile } =
    useRemoteAccountProfile();
  const authGate = useAuthGate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResettingLocalData, setIsResettingLocalData] = useState(false);
  const styles = useThemedStyles(createSettingsStyles);
  const showLogout = account.isConfigured && account.isLinked;
  const unreadNotifications = useUnreadNotificationsCount();

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

  const runResetLocalData = useCallback(
    (deleteRemoteAccount: boolean) => {
      void (async () => {
        setIsResettingLocalData(true);

        try {
          await resetLocalDeviceData({ deleteRemoteAccount });
          navigation.finishSignInToTimeline();
          await authGate.refresh();
          await account.refresh();
        } catch (error) {
          Alert.alert(
            t('settings.resetLocalDataFailedTitle'),
            error instanceof Error
              ? error.message
              : t('settings.resetLocalDataFailedMessage'),
          );
        } finally {
          setIsResettingLocalData(false);
        }
      })();
    },
    [account, authGate, navigation],
  );

  const handleResetLocalData = useCallback(() => {
    Alert.alert(
      t('settings.resetLocalDataConfirmTitle'),
      t('settings.resetLocalDataConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetLocalDataLocalOnlyLabel'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.resetLocalDataLocalOnlyLabel'),
              t('settings.resetLocalDataLocalOnlyMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.resetLocalDataLocalOnlyLabel'),
                  style: 'destructive',
                  onPress: () => runResetLocalData(false),
                },
              ],
            );
          },
        },
        {
          text: t('settings.resetLocalDataLocalAndRemoteLabel'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.resetLocalDataLocalAndRemoteLabel'),
              t('settings.resetLocalDataLocalAndRemoteMessage'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.resetLocalDataLocalAndRemoteLabel'),
                  style: 'destructive',
                  onPress: () => runResetLocalData(true),
                },
              ],
            );
          },
        },
      ],
    );
  }, [runResetLocalData]);

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

  const handleCloudImageUploadsToggle = useCallback(
    (enabled: boolean) => {
      void (async () => {
        try {
          await setCloudImageUploadsEnabled(enabled);

          if (!enabled) {
            return;
          }

          const database = await getDatabase();
          await runCloudSyncPass(database);
        } catch (error) {
          Alert.alert(
            t('settings.preferenceSyncFailedTitle'),
            error instanceof Error
              ? error.message
              : t('settings.preferenceSyncFailedMessage'),
          );
        }
      })();
    },
    [],
  );

  const languageOptions = [
    { value: 'en' as const, label: t('settings.languages.english') },
    {
      value: 'zh-Hans' as const,
      label: t('settings.languages.simplifiedChinese'),
    },
  ];

  const themeOptions = [
    { value: 'light' as AppTheme, label: t('settings.themes.light') },
    { value: 'dark' as AppTheme, label: t('settings.themes.dark') },
  ];

  const fontStyleOptions = APP_FONT_STYLES.map((value) => ({
    value,
    label: t(FONT_STYLE_LABEL_KEYS[value]),
    labelStyle: {
      fontFamily: getFontFamilyForStyle(value, '600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
  }));

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
      return t('userProfile.settingsRowLabelAnonymous');
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
          onPress={() =>
            navigation.push(
              'AccountSettings',
              account.isLinked ? undefined : { mode: 'link' },
            )
          }
        />
        <SettingsRow
          description={t('settings.notificationsDescription')}
          detail={
            unreadNotifications > 0
              ? t('settings.notificationsUnreadCount', {
                  count: String(unreadNotifications),
                })
              : undefined
          }
          isLast
          label={t('settings.notificationsLabel')}
          styles={styles}
          onPress={() => navigation.push('NotificationsInbox')}
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

      {appEnv.showDeveloperSettings ? (
        <SettingsSection
          styles={styles}
          title={t('settings.sections.developer')}
        >
          <SettingsToggleRow
            isLast={false}
            iosBackgroundColor={colors.border}
            label={t('settings.developerImageUploadsLabel')}
            styles={styles}
            thumbColor={colors.surface}
            trackFalseColor={colors.border}
            trackTrueColor={colors.accent}
            value={cloudImageUploadsEnabled}
            onValueChange={handleCloudImageUploadsToggle}
          />
          <SettingsRow
            isLast
            label={t('settings.resetLocalDataLabel')}
            styles={styles}
            onPress={isResettingLocalData ? undefined : handleResetLocalData}
          />
        </SettingsSection>
      ) : null}

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
  detail,
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
      {detail ? (
        <View style={styles.rowDetailBadge}>
          <Text style={styles.rowDetailText}>{detail}</Text>
        </View>
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

function SettingsToggleRow({
  description,
  isLast = false,
  iosBackgroundColor,
  label,
  onValueChange,
  styles,
  thumbColor,
  trackFalseColor,
  trackTrueColor,
  value,
}: {
  description?: string;
  isLast?: boolean;
  iosBackgroundColor: string;
  label: string;
  onValueChange: (value: boolean) => void;
  styles: SettingsStyles;
  thumbColor: string;
  trackFalseColor: string;
  trackTrueColor: string;
  value: boolean;
}) {
  const stateLabel = value ? t('common.on') : t('common.off');

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [
        styles.row,
        isLast && styles.rowLast,
        pressed && styles.rowPressed,
      ]}
      onPress={() => onValueChange(!value)}
    >
      <View style={styles.rowInner}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? (
          <Text style={styles.rowDescription}>{description}</Text>
        ) : null}
      </View>
      <Text style={styles.toggleLabel}>{stateLabel}</Text>
      <Switch
        ios_backgroundColor={iosBackgroundColor}
        pointerEvents="none"
        style={styles.toggleControl}
        thumbColor={thumbColor}
        trackColor={{
          false: trackFalseColor,
          true: trackTrueColor,
        }}
        value={value}
        onValueChange={onValueChange}
      />
    </Pressable>
  );
}
