import { StyleSheet, Text, View } from 'react-native';

import { AppIconMark } from '@/components/AppIconMark';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { MIN_TOUCH_TARGET } from '@/lib/responsive';
import { TIMELINE_SCROLL_TO_TOP_THRESHOLD } from '@/modules/timeline/timelineScrollThreshold';

import {
  TimelineFilterDropdown,
  type TimelineListFilter,
} from './TimelineFilterDropdown';
import { TimelineScrollToTopTrigger } from './TimelineScrollToTopTrigger';

const TOP_BAR_ICON_SIZE = 36;

type TimelineTopBarProps = {
  topPadding: number;
  scrollOffsetY: number;
  timelineFilter: TimelineListFilter;
  onScrollToTop: () => void;
  onTimelineFilterChange: (value: TimelineListFilter) => void;
};

function createTimelineTopBarStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    bar: {
      backgroundColor: colors.background,
      elevation: 2,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.lg,
      zIndex: 20,
    },
    row: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      minHeight: MIN_TOUCH_TARGET,
      position: 'relative' as const,
    },
    side: {
      alignItems: 'flex-start' as const,
      justifyContent: 'center' as const,
      minHeight: MIN_TOUCH_TARGET,
      width: MIN_TOUCH_TARGET,
      zIndex: 1,
    },
    sideRight: {
      alignItems: 'flex-end' as const,
      marginLeft: 'auto' as const,
    },
    title: {
      ...StyleSheet.absoluteFillObject,
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 16,
      lineHeight: MIN_TOUCH_TARGET,
      textAlign: 'center' as const,
    },
  };
}

/** Fixed timeline toolbar: app icon (left), Moments title (center), filter or scroll-to-top (right). */
export function TimelineTopBar({
  topPadding,
  scrollOffsetY,
  timelineFilter,
  onScrollToTop,
  onTimelineFilterChange,
}: TimelineTopBarProps) {
  const styles = useThemedStyles(createTimelineTopBarStyles);
  const showScrollToTop = scrollOffsetY > TIMELINE_SCROLL_TO_TOP_THRESHOLD;

  return (
    <View style={[styles.bar, { paddingTop: topPadding }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          <AppIconMark size={TOP_BAR_ICON_SIZE} />
        </View>

        <Text style={styles.title} pointerEvents="none">
          {t('home.momentsSubtitle')}
        </Text>

        <View style={[styles.side, styles.sideRight]}>
          {showScrollToTop ? (
            <TimelineScrollToTopTrigger onPress={onScrollToTop} />
          ) : (
            <TimelineFilterDropdown
              value={timelineFilter}
              onChange={onTimelineFilterChange}
            />
          )}
        </View>
      </View>
    </View>
  );
}
