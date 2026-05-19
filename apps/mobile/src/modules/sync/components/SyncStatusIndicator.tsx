import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';

type SyncStatusIndicatorProps = {
  isSyncing: boolean;
  hasPendingMemories: boolean;
};

export function SyncStatusIndicator({
  isSyncing,
  hasPendingMemories,
}: SyncStatusIndicatorProps) {
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

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  text: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
