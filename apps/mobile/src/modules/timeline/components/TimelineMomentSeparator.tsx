import { View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

function createTimelineMomentSeparatorStyles(_: AppearanceContextValue) {
  return {
    separator: {
      height: spacing.lg,
    },
  };
}

/** Calm vertical breathing room between full-bleed moments and date dividers. */
export function TimelineMomentSeparator() {
  const styles = useThemedStyles(createTimelineMomentSeparatorStyles);

  return <View style={styles.separator} />;
}
