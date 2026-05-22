import { Pressable, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { t, useAppLocale } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { useNavigation } from '@/navigation/NavigationContext';

import { useAuthAccountStatus } from './useAuthAccountStatus';

function createSaveMemoriesLinkStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
    },
    copy: {
      gap: spacing.xs,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    buttonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
    },
  };
}

/** Soft entry to email account upgrade — only for anonymous remote sessions. */
export function SaveMemoriesLink() {
  useAppLocale();
  const navigation = useNavigation();
  const account = useAuthAccountStatus();
  const styles = useThemedStyles(createSaveMemoriesLinkStyles);

  if (account.isLoading || !account.isConfigured || !account.isAnonymous) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('account.title')}</Text>
        <Text style={styles.body}>{t('account.body')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => navigation.openSettings({ section: 'account' })}
      >
        <Text style={styles.buttonText}>{t('account.saveMemoriesLink')}</Text>
      </Pressable>
    </View>
  );
}
