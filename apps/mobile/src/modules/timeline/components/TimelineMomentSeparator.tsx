import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

/** Soft rhythm between timeline moments — gap first, hairline second. */
export function TimelineMomentSeparator() {
  return (
    <View style={styles.separator}>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  separator: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
  },
  line: {
    backgroundColor: colors.timelineDivider,
    height: 1,
  },
});
