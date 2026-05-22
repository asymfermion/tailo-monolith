import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { t, useAppLocale } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

type SyncStatusIndicatorProps = {
  isSyncing: boolean;
  hasPendingMemories: boolean;
};

function createSyncStatusIndicatorStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    container: {
      alignSelf: 'flex-start' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    text: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 13,
      fontWeight: '600' as const,
    },
  };
}

export function SyncStatusIndicator({
  isSyncing,
  hasPendingMemories,
}: SyncStatusIndicatorProps) {
  useAppLocale();
  const styles = useThemedStyles(createSyncStatusIndicatorStyles);

  if (!isSyncing && !hasPendingMemories) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isSyncing ? t('sync.statusSaving') : t('sync.statusRemembering')}
      </Text>
    </View>
  );
}
