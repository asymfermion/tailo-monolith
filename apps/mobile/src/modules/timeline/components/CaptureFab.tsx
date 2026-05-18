import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';

type CaptureFabProps = {
  onPress: () => void;
};

export function CaptureFab({ onPress }: CaptureFabProps) {
  return (
    <View pointerEvents="box-none" style={styles.container}>
      <Pressable
        accessibilityLabel={t('accessibility.captureMoment')}
        accessibilityRole="button"
        style={styles.button}
        onPress={onPress}
      >
        <Text style={styles.icon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  icon: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: '500',
    lineHeight: 32,
  },
});
