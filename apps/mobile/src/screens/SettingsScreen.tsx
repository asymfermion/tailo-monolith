import { useMemo, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';
import { setAppLocale, t, useAppLocale } from '@/i18n';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';

type SettingsRowProps = {
  description?: string;
  label: string;
  onPress?: () => void;
};

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const tabBarContentInset = useTabBarContentInset();
  const locale = useAppLocale();
  const [isLanguageListOpen, setIsLanguageListOpen] = useState(false);
  const selectedLanguageLabel = useMemo(
    () =>
      locale === 'zh-Hans'
        ? t('settings.languages.simplifiedChinese')
        : t('settings.languages.english'),
    [locale],
  );

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

      <SettingsSection title={t('settings.sections.account')}>
        <SettingsRow
          description={t('settings.accountDescription')}
          label={t('settings.accountLabel')}
          onPress={() => navigation.push('AccountSettings')}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.localization')}>
        <LanguageDropdown
          isOpen={isLanguageListOpen}
          selectedLabel={selectedLanguageLabel}
          onToggle={() => setIsLanguageListOpen((value) => !value)}
        />
        {isLanguageListOpen ? (
          <>
            <LanguageOption
              isSelected={locale === 'en'}
              label={t('settings.languages.english')}
              onPress={() => {
                void setAppLocale('en');
                setIsLanguageListOpen(false);
              }}
            />
            <LanguageOption
              isSelected={locale === 'zh-Hans'}
              label={t('settings.languages.simplifiedChinese')}
              onPress={() => {
                void setAppLocale('zh-Hans');
                setIsLanguageListOpen(false);
              }}
            />
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection title={t('settings.sections.preferences')}>
        <SettingsRow
          description={t('settings.timelineScanDescription')}
          label={t('settings.timelineScanLabel')}
          onPress={() => navigation.setActiveTab('Timeline')}
        />
        <SettingsRow
          description={t('settings.petProfileDescription')}
          label={t('settings.petProfileLabel')}
          onPress={() => navigation.setActiveTab('PetProfile')}
        />
      </SettingsSection>
    </ScrollView>
  );
}

function LanguageDropdown({
  isOpen,
  onToggle,
  selectedLabel,
}: {
  isOpen: boolean;
  onToggle: () => void;
  selectedLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={t('settings.languageLabel')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onToggle}
    >
      <Text style={[styles.rowLabel, styles.languageSelection]}>
        {selectedLabel}
      </Text>
      <View style={styles.chevronWrap}>
        <Ionicons
          color={colors.textMuted}
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
        />
      </View>
    </Pressable>
  );
}

function LanguageOption({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.languageOptionRow,
        pressed && styles.rowPressed,
        isSelected && styles.rowSelected,
      ]}
      onPress={onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.languageCheck}>{isSelected ? '✓' : ''}</Text>
    </Pressable>
  );
}

function SettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({ description, label, onPress }: SettingsRowProps) {
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  rowSelected: {
    backgroundColor: colors.background,
  },
  languageOptionRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowInner: {
    flex: 1,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  languageSelection: {
    flex: 1,
  },
  rowDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 22,
    marginLeft: spacing.sm,
  },
  chevronWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 24,
  },
  languageCheck: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: spacing.sm,
    minWidth: 16,
    textAlign: 'center',
  },
});
