import { Ionicons } from '@expo/vector-icons';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
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
  leadingIcon?: keyof typeof Ionicons.glyphMap;
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
      fontFamily: getFontFamily('700'),
      fontSize: 30,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    titleRow: {
      alignItems: 'flex-start' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
      paddingRight: spacing.sm,
    },
    inboxButton: {
      alignItems: 'center' as const,
      height: 44,
      justifyContent: 'center' as const,
      marginTop: -6,
      position: 'relative' as const,
      width: 44,
    },
    inboxButtonPressed: {
      opacity: 0.72,
    },
    inboxBadge: {
      alignItems: 'center' as const,
      backgroundColor: colors.destructive,
      borderRadius: 9,
      height: 18,
      justifyContent: 'center' as const,
      minWidth: 18,
      paddingHorizontal: 4,
      position: 'absolute' as const,
      right: 2,
      top: 4,
    },
    inboxBadgeText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 11,
      fontWeight: '600' as const,
      lineHeight: 14,
      textAlign: 'center' as const,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 20,
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
      lineHeight: 16,
      marginBottom: spacing.sm,
      textTransform: 'uppercase' as const,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden' as const,
    },
    sectionCardCompact: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden' as const,
    },
    accountRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      minHeight: 76,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    accountRowPressed: {
      backgroundColor: colors.background,
    },
    accountRowInner: {
      flex: 1,
      minWidth: 0,
    },
    accountRowName: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    accountRowEmail: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
    standaloneCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden' as const,
    },
    rowFrame: {
      position: 'relative' as const,
    },
    row: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      minHeight: 56,
      paddingHorizontal: 18,
      paddingVertical: 0,
    },
    rowWithDescription: {
      minHeight: 88,
      paddingVertical: 14,
    },
    rowPressed: {
      backgroundColor: colors.background,
    },
    rowDivider: {
      backgroundColor: colors.border,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      left: 18,
      position: 'absolute' as const,
      right: 18,
    },
    leadingIconBadge: {
      alignItems: 'center' as const,
      backgroundColor: colors.background,
      borderRadius: 18,
      height: 36,
      justifyContent: 'center' as const,
      marginRight: 15,
      width: 36,
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
      lineHeight: 21,
    },
    rowDescription: {
      color: colors.textMuted,
      flexShrink: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
    rowDetailBadge: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 11,
      height: 22,
      justifyContent: 'center' as const,
      marginLeft: 10,
      minWidth: 30,
      paddingHorizontal: spacing.sm,
    },
    rowDetailText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
    chevronWrap: {
      alignItems: 'center' as const,
      height: 20,
      justifyContent: 'center' as const,
      marginLeft: spacing.sm,
      width: 20,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    toggleControl: {
      marginLeft: spacing.sm,
    },
    logoutFooter: {
      marginTop: spacing.lg,
    },
    logoutButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      justifyContent: 'center' as const,
      minHeight: 56,
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
      lineHeight: 20,
      textAlign: 'center' as const,
      width: '100%' as const,
    },
    versionLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 12,
      lineHeight: 16,
      marginTop: spacing.lg,
      textAlign: 'center' as const,
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

  const handleCloudImageUploadsToggle = useCallback((enabled: boolean) => {
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
  }, []);

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
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t('navigation.tabs.Settings')}</Text>
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
        </View>
        <Pressable
          accessibilityLabel={t('settings.openNotificationsInboxLabel')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.inboxButton,
            pressed && styles.inboxButtonPressed,
          ]}
          onPress={() => navigation.push('NotificationsInbox')}
        >
          <Ionicons
            color={colors.text}
            name="notifications-outline"
            size={24}
          />
          {unreadNotifications > 0 ? (
            <View style={styles.inboxBadge}>
              <Text style={styles.inboxBadgeText}>
                {unreadNotifications > 9 ? '9+' : String(unreadNotifications)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <SettingsSection
        hasCard={false}
        styles={styles}
        title={t('settings.sections.account')}
      >
        <SettingsCard styles={styles}>
          <SettingsAccountRow
            email={accountDescription}
            label={accountLabel}
            styles={styles}
            onPress={() =>
              navigation.push(
                'AccountSettings',
                account.isLinked ? undefined : { mode: 'link' },
              )
            }
          />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        cardVariant="compact"
        styles={styles}
        title={t('settings.sections.notifications')}
      >
        <SettingsRow
          description={t('settings.notificationSettingsDescription')}
          isLast
          label={t('settings.notificationSettingsLabel')}
          styles={styles}
          onPress={() => navigation.push('NotificationSettings')}
        />
      </SettingsSection>

      <SettingsSection
        styles={styles}
        title={t('settings.sections.preferences')}
      >
        <SettingsOptionPicker
          accessibilityLabel={t('settings.languageLabel')}
          label={t('settings.languageLabel')}
          options={languageOptions}
          selectedLabel={selectedLanguageLabel}
          selectedValue={locale}
          showDivider
          onSelect={handleLanguageSelect}
        />
        <SettingsOptionPicker
          accessibilityLabel={t('settings.themeLabel')}
          label={t('settings.themeLabel')}
          options={themeOptions}
          selectedLabel={
            theme === 'dark'
              ? t('settings.themes.dark')
              : t('settings.themes.light')
          }
          selectedValue={theme}
          showDivider
          onSelect={handleThemeSelect}
        />
        <SettingsOptionPicker
          accessibilityLabel={t('settings.fontStyleLabel')}
          label={t('settings.fontStyleLabel')}
          options={fontStyleOptions}
          selectedLabel={t(FONT_STYLE_LABEL_KEYS[fontStyle])}
          selectedValue={fontStyle}
          onSelect={handleFontStyleSelect}
        />
      </SettingsSection>

      <SettingsSection
        cardVariant="compact"
        styles={styles}
        title={t('settings.sections.privacy')}
      >
        <SettingsRow
          isLast
          label={t('settings.privacyPermissionsLabel')}
          styles={styles}
          onPress={() => navigation.push('PrivacyPermissions')}
        />
      </SettingsSection>

      {appEnv.showDeveloperSettings ? (
        <SettingsSection
          cardVariant="compact"
          styles={styles}
          title={t('settings.sections.developer')}
        >
          <SettingsToggleRow
            description={t('settings.developerImageUploadsDescription')}
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

      <Text style={styles.versionLabel}>
        {t('settings.versionLabel', { version: appEnv.appVersion })}
      </Text>
    </ScrollView>
  );
}

function SettingsSection({
  cardVariant = 'default',
  children,
  hasCard = true,
  styles,
  title,
}: {
  cardVariant?: 'compact' | 'default';
  children: ReactNode;
  hasCard?: boolean;
  styles: SettingsStyles;
  title: string;
}) {
  const cardStyle =
    cardVariant === 'compact' ? styles.sectionCardCompact : styles.sectionCard;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hasCard ? <View style={cardStyle}>{children}</View> : children}
    </View>
  );
}

function SettingsAccountRow({
  email,
  label,
  onPress,
  styles,
}: {
  email: string;
  label: string;
  onPress: () => void;
  styles: SettingsStyles;
}) {
  const { colors } = useAppearance();

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.accountRow,
        pressed && styles.accountRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.accountRowInner}>
        <Text numberOfLines={1} style={styles.accountRowName}>
          {label}
        </Text>
        <Text numberOfLines={1} style={styles.accountRowEmail}>
          {email}
        </Text>
      </View>
      <View style={styles.chevronWrap}>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
      </View>
    </Pressable>
  );
}

function SettingsCard({
  children,
  styles,
}: {
  children: ReactNode;
  styles: SettingsStyles;
}) {
  return <View style={styles.standaloneCard}>{children}</View>;
}

function SettingsRow({
  description,
  detail,
  isLast = false,
  label,
  leadingIcon,
  onPress,
  styles,
}: SettingsRowProps & {
  isLast?: boolean;
  styles: SettingsStyles;
}) {
  const { colors } = useAppearance();
  const content = (
    <>
      {leadingIcon ? (
        <View style={styles.leadingIconBadge}>
          <Ionicons color={colors.text} name={leadingIcon} size={20} />
        </View>
      ) : null}
      <View style={styles.rowInner}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? (
          <Text style={styles.rowDescription}>{description}</Text>
        ) : null}
      </View>
      {detail ? (
        <View style={styles.rowDetailBadge}>
          <Text style={styles.rowDetailText}>{detail}</Text>
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.rowFrame}>
        <View
          style={[
            styles.row,
            description ? styles.rowWithDescription : null,
            isLast && styles.rowLast,
          ]}
        >
          {content}
        </View>
        {!isLast ? <View style={styles.rowDivider} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.rowFrame}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          description ? styles.rowWithDescription : null,
          isLast && styles.rowLast,
          pressed && styles.rowPressed,
        ]}
        onPress={onPress}
      >
        {content}
        <View style={styles.chevronWrap}>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
        </View>
      </Pressable>
      {!isLast ? <View style={styles.rowDivider} /> : null}
    </View>
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
  return (
    <View style={styles.rowFrame}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        style={({ pressed }) => [
          styles.row,
          description ? styles.rowWithDescription : null,
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
      {!isLast ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}
