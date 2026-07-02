import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { useAppLocale } from '@/i18n';

import {
  getTimelineDateBucketLabel,
  type TimelineDateBucket,
} from '../dateBuckets';

function createTimelineDateDividerStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    row: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: 12,
      paddingHorizontal: spacing.md,
    },
    label: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.24,
      textTransform: 'uppercase' as const,
    },
    line: {
      backgroundColor: colors.timelineDivider,
      flex: 1,
      height: StyleSheet.hairlineWidth,
    },
  };
}

/** Calm relative date heading ("Today", "This week") between timeline moments. */
export function TimelineDateDivider({
  bucket,
}: {
  bucket: TimelineDateBucket;
}) {
  useAppLocale();
  const styles = useThemedStyles(createTimelineDateDividerStyles);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{getTimelineDateBucketLabel(bucket)}</Text>
      <View style={styles.line} />
    </View>
  );
}
