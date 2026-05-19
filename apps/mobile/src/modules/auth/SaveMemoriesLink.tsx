import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useNavigation } from '@/navigation/NavigationContext';

import { useAuthAccountStatus } from './useAuthAccountStatus';

/** Soft entry to email account upgrade — only for anonymous remote sessions. */
export function SaveMemoriesLink() {
  const navigation = useNavigation();
  const account = useAuthAccountStatus();

  if (account.isLoading || !account.isConfigured || !account.isAnonymous) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      style={styles.link}
      onPress={() => navigation.push('AccountSettings')}
    >
      <Text style={styles.linkText}>{t('account.saveMemoriesLink')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  linkText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
