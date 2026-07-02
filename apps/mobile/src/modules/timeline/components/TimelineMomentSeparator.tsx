import { View } from 'react-native';

import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

function createTimelineMomentSeparatorStyles(_: AppearanceContextValue) {
  return {
    separator: {
      height: 12,
    },
  };
}

/** Calm vertical breathing room between full-bleed moments and date dividers. */
export function TimelineMomentSeparator() {
  const styles = useThemedStyles(createTimelineMomentSeparatorStyles);

  return <View style={styles.separator} />;
}
