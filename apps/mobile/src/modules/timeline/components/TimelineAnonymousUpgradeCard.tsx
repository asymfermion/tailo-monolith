import { Pressable, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

type TimelineAnonymousUpgradeCardProps = {
  onCreateAccount: () => void;
};

function createTimelineAnonymousUpgradeCardStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      padding: spacing.md,
    },
    eyebrow: {
      color: colors.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      paddingTop: spacing.xs,
    },
    createButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 999,
      flex: 1,
      minHeight: 44,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.md,
    },
    createButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
    },
  };
}

export function TimelineAnonymousUpgradeCard({
  onCreateAccount,
}: TimelineAnonymousUpgradeCardProps) {
  const styles = useThemedStyles(createTimelineAnonymousUpgradeCardStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        {t('timeline.anonymousUpgrade.eyebrow')}
      </Text>
      <Text style={styles.title}>{t('timeline.anonymousUpgrade.title')}</Text>
      <Text style={styles.body}>{t('timeline.anonymousUpgrade.body')}</Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.createButton}
          onPress={onCreateAccount}
        >
          <Text style={styles.createButtonText}>
            {t('timeline.anonymousUpgrade.createAccount')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
