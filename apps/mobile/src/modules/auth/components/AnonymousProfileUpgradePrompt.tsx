import { Text } from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useThemedStyles } from '@/lib/appearance';

export function AnonymousProfileUpgradePrompt() {
  const styles = useThemedStyles(({ colors, getFontFamily }) => ({
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 28,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    intro: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.sm,
      textAlign: 'center' as const,
    },
  }));

  return (
    <>
      <Text style={styles.title}>{t('userProfile.anonymousHeadline')}</Text>
      <Text style={styles.intro}>{t('userProfile.anonymousIntro')}</Text>
    </>
  );
}
