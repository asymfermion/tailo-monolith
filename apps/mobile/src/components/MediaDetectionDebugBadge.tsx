import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { appEnv } from '@/lib/env';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { formatMediaDetectionDebug } from '@/lib/formatMediaDetectionDebug';
import type { TimelineEventMedia } from '@/types';

type MediaDetectionDebugBadgeProps = {
  media: TimelineEventMedia;
  compact?: boolean;
};

function createMediaDetectionDebugBadgeStyles({
  colors,
}: AppearanceContextValue) {
  return {
    badge: {
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      borderRadius: 6,
      bottom: spacing.xs,
      left: spacing.xs,
      maxWidth: '96%' as const,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      position: 'absolute' as const,
      right: spacing.xs,
    },
    badgeCompact: {
      bottom: 4,
      left: 4,
      paddingHorizontal: 6,
      paddingVertical: 4,
      right: 4,
    },
    text: {
      color: colors.background,
      fontFamily: 'Menlo',
      fontSize: 11,
      lineHeight: 14,
    },
    textCompact: {
      fontSize: 9,
      lineHeight: 12,
    },
  };
}

export function MediaDetectionDebugBadge({
  media,
  compact = false,
}: MediaDetectionDebugBadgeProps) {
  const styles = useThemedStyles(createMediaDetectionDebugBadgeStyles);

  if (!appEnv.isDev) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.badge, compact && styles.badgeCompact]}
    >
      <Text
        numberOfLines={compact ? 2 : 3}
        style={[styles.text, compact && styles.textCompact]}
      >
        {formatMediaDetectionDebug(media)}
      </Text>
    </View>
  );
}
