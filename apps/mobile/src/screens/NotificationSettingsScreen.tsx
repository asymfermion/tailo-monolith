import { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useThemedStyles,
  useAppearance,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { setNotificationPreferencesAndSyncProfile } from '@/modules/auth/persistAppPreferenceAndSync';
import { useAuthAccountStatus } from '@/modules/auth';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { useNavigation } from '@/navigation/NavigationContext';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';
import {
  useNotificationPreferences,
  type EmailSummaryFrequency,
  type NotificationPreferences,
} from '@/modules/notifications/notificationPreferences';

import { SettingsOptionPicker } from './settings/SettingsOptionPicker';

function createNotificationSettingsStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    header: {
      gap: spacing.xs,
      marginTop: spacing.md,
      minHeight: 128,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 25,
      textAlign: 'center' as const,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.lg,
    },
    content: {
      flexGrow: 1,
      paddingBottom: spacing.xl,
      paddingTop: spacing.sm,
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
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden' as const,
    },
    rowFrame: {
      position: 'relative' as const,
    },
    row: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      minHeight: 60,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    rowWithDescription: {
      alignItems: 'flex-start' as const,
      minHeight: 60,
      paddingVertical: 12,
    },
    rowPressed: {
      backgroundColor: colors.background,
    },
    rowInner: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    rowDescription: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 12,
      lineHeight: 16,
      marginTop: spacing.xs,
    },
    rowDivider: {
      backgroundColor: colors.border,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      left: 18,
      position: 'absolute' as const,
      right: 18,
    },
    toggleControl: {
      marginLeft: spacing.sm,
      marginTop: 2,
    },
  };
}

type NotificationSettingsStyles = ReturnType<
  typeof createNotificationSettingsStyles
>;

function NotificationToggleRow({
  description,
  isLast = false,
  label,
  onValueChange,
  styles,
  value,
}: {
  description: string;
  isLast?: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  styles: NotificationSettingsStyles;
  value: boolean;
}) {
  const { colors } = useAppearance();

  return (
    <View style={styles.rowFrame}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        style={({ pressed }) => [
          styles.row,
          styles.rowWithDescription,
          pressed && styles.rowPressed,
        ]}
        onPress={() => onValueChange(!value)}
      >
        <View style={styles.rowInner}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowDescription}>{description}</Text>
        </View>
        <Switch
          ios_backgroundColor={colors.border}
          pointerEvents="none"
          style={styles.toggleControl}
          thumbColor={colors.surface}
          trackColor={{
            false: colors.border,
            true: colors.accent,
          }}
          value={value}
          onValueChange={onValueChange}
        />
      </Pressable>
      {!isLast ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

const EMAIL_SUMMARY_LABEL_KEYS: Record<EmailSummaryFrequency, string> = {
  weekly: 'settings.notificationSettings.emailSummaries.weekly',
  off: 'settings.notificationSettings.emailSummaries.off',
};

export function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useThemedStyles(createNotificationSettingsStyles);
  const preferences = useNotificationPreferences();
  const account = useAuthAccountStatus();
  const shouldSyncProfile =
    account.isConfigured && !account.isLoading && account.isLinked;

  const updatePreference = useCallback(
    <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K],
    ) => {
      const next = { ...preferences, [key]: value };
      void setNotificationPreferencesAndSyncProfile(next, {
        syncToRemoteProfile: shouldSyncProfile,
      });
    },
    [preferences, shouldSyncProfile],
  );

  const pushOptions = [
    { value: 'on' as const, label: t('common.on') },
    { value: 'off' as const, label: t('common.off') },
  ] as const;

  const selectedPushValue = preferences.pushNotifications ? 'on' : 'off';

  const emailSummaryOptions = [
    {
      value: 'weekly' as const,
      label: t('settings.notificationSettings.emailSummaries.weekly'),
    },
    {
      value: 'off' as const,
      label: t('settings.notificationSettings.emailSummaries.off'),
    },
  ];

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: getModalHeaderTopInset(insets.top),
        },
      ]}
    >
      <ModalBackButton align="leading" onPress={navigation.pop} />
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('settings.notificationSettings.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('settings.notificationSettings.subtitle')}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.notificationSettings.sections.activity')}
          </Text>
          <View style={styles.sectionCard}>
            <NotificationToggleRow
              description={t(
                'settings.notificationSettings.newMemoriesDescription',
              )}
              label={t('settings.notificationSettings.newMemoriesLabel')}
              styles={styles}
              value={preferences.newMemories}
              onValueChange={(value) => updatePreference('newMemories', value)}
            />
            <NotificationToggleRow
              description={t(
                'settings.notificationSettings.timelineUpdatesDescription',
              )}
              label={t('settings.notificationSettings.timelineUpdatesLabel')}
              styles={styles}
              value={preferences.timelineUpdates}
              onValueChange={(value) =>
                updatePreference('timelineUpdates', value)
              }
            />
            <NotificationToggleRow
              description={t(
                'settings.notificationSettings.accountActivityDescription',
              )}
              isLast
              label={t('settings.notificationSettings.accountActivityLabel')}
              styles={styles}
              value={preferences.accountActivity}
              onValueChange={(value) =>
                updatePreference('accountActivity', value)
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.notificationSettings.sections.delivery')}
          </Text>
          <View style={styles.sectionCard}>
            <SettingsOptionPicker<'on' | 'off'>
              accessibilityLabel={t(
                'settings.notificationSettings.pushNotificationsLabel',
              )}
              label={t('settings.notificationSettings.pushNotificationsLabel')}
              options={pushOptions}
              selectedLabel={
                preferences.pushNotifications ? t('common.on') : t('common.off')
              }
              selectedValue={selectedPushValue}
              showDivider
              onSelect={(value) =>
                updatePreference('pushNotifications', value === 'on')
              }
            />
            <SettingsOptionPicker
              accessibilityLabel={t(
                'settings.notificationSettings.emailSummariesLabel',
              )}
              label={t('settings.notificationSettings.emailSummariesLabel')}
              options={emailSummaryOptions}
              selectedLabel={t(
                EMAIL_SUMMARY_LABEL_KEYS[preferences.emailSummaries],
              )}
              selectedValue={preferences.emailSummaries}
              onSelect={(value) => updatePreference('emailSummaries', value)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
