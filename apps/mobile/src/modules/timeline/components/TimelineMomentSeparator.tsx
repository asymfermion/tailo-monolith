import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

function createTimelineMomentSeparatorStyles({
  colors,
}: AppearanceContextValue) {
  return {
    separator: {
      paddingBottom: spacing.lg,
      paddingTop: spacing.xl,
    },
    line: {
      backgroundColor: colors.timelineDivider,
      height: 1,
    },
  };
}

/** Soft rhythm between timeline moments — gap first, hairline second. */
export function TimelineMomentSeparator() {
  const styles = useThemedStyles(createTimelineMomentSeparatorStyles);

  return (
    <View style={styles.separator}>
      <View style={styles.line} />
    </View>
  );
}
