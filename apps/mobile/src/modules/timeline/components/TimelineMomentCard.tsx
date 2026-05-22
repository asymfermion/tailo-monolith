import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { formatEventType, formatTimestamp } from '@/lib/formatMoment';
import { t, useAppLocale } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import type { TimelineEvent, TimelineEventMedia } from '@/types';

import { MomentActionMenu } from './MomentActionMenu';

type TimelineMomentCardProps = {
  event: TimelineEvent;
  onDelete: (localEventId: string) => void;
  onEdit: (localEventId: string) => void;
  onPress: (localEventId: string) => void;
  onPressPhoto: (event: TimelineEvent, photoIndex: number) => void;
  onShare: (localEventId: string) => void;
  onToggleFavorite: (localEventId: string, isFavorite: boolean) => void;
};

function createTimelineMomentCardStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    card: {
      gap: spacing.sm,
    },
    headerRow: {
      alignItems: 'flex-start' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    headerMain: {
      flex: 1,
      gap: spacing.xs,
      minWidth: 0,
    },
    headerActions: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.xs,
    },
    iconButton: {
      alignItems: 'center' as const,
      height: 40,
      justifyContent: 'center' as const,
      width: 40,
    },
    momentType: {
      color: colors.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 13,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    momentTime: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
    },
    caption: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 17,
      fontWeight: '500' as const,
      lineHeight: 24,
      marginTop: spacing.sm,
    },
    mediaGrid: {
      gap: spacing.sm,
    },
    imageFrame: {
      flex: 1,
      minWidth: 0,
      position: 'relative' as const,
    },
    primaryImage: {
      aspectRatio: 1.16,
      width: '100%' as const,
      overflow: 'hidden' as const,
      borderRadius: 14,
      backgroundColor: colors.border,
    },
    secondaryGrid: {
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    secondaryImage: {
      aspectRatio: 1,
      flex: 1,
      minWidth: 0,
      overflow: 'hidden' as const,
      borderRadius: 10,
      backgroundColor: colors.border,
    },
  };
}

function TimelineMomentCardComponent({
  event,
  onDelete,
  onEdit,
  onPress,
  onPressPhoto,
  onShare,
  onToggleFavorite,
}: TimelineMomentCardProps) {
  useAppLocale();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createTimelineMomentCardStyles);
  const primaryMedia = event.media[0];
  const secondaryMedia = event.media.slice(1, 5);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          style={styles.headerMain}
          onPress={() => onPress(event.localEventId)}
        >
          <Text style={styles.momentType}>
            {formatEventType(event.eventType)}
          </Text>
          <Text style={styles.momentTime}>
            {formatTimestamp(event.timestamp)}
          </Text>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={
              event.isFavorite
                ? t('timeline.moment.removeFavorite')
                : t('timeline.moment.addFavorite')
            }
            accessibilityRole="button"
            hitSlop={8}
            style={styles.iconButton}
            onPress={() =>
              onToggleFavorite(event.localEventId, !event.isFavorite)
            }
          >
            <Ionicons
              color={event.isFavorite ? colors.accent : colors.textMuted}
              name={event.isFavorite ? 'star' : 'star-outline'}
              size={24}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={t('timeline.moment.share')}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.iconButton}
            onPress={() => onShare(event.localEventId)}
          >
            <Ionicons
              color={colors.textMuted}
              name="paper-plane-outline"
              size={22}
            />
          </Pressable>
          <MomentActionMenu
            onDelete={() => onDelete(event.localEventId)}
            onEdit={() => onEdit(event.localEventId)}
          />
        </View>
      </View>

      {primaryMedia ? (
        <View style={styles.mediaGrid}>
          <Pressable
            accessibilityLabel={t('accessibility.primaryMomentPhoto')}
            accessibilityRole="button"
            onPress={() => onPressPhoto(event, 0)}
          >
            <View style={styles.imageFrame}>
              <Image
                contentFit="cover"
                source={{ uri: primaryMedia.uri }}
                style={styles.primaryImage}
              />
            </View>
          </Pressable>
          {secondaryMedia.length > 0 ? (
            <View style={styles.secondaryGrid}>
              {secondaryMedia.map((media, index) => (
                <MomentImage
                  key={media.localAssetId}
                  media={media}
                  onPress={() => onPressPhoto(event, index + 1)}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {event.caption ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onPress(event.localEventId)}
        >
          <Text style={styles.caption}>{event.caption}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function eventMediaSignature(media: TimelineEventMedia[]): string {
  return media
    .map((item) => `${item.localAssetId}:${item.uri}:${item.isPrimary ? 1 : 0}`)
    .join('|');
}

function areTimelineMomentCardPropsEqual(
  previous: TimelineMomentCardProps,
  next: TimelineMomentCardProps,
): boolean {
  return (
    previous.onPress === next.onPress &&
    previous.onPressPhoto === next.onPressPhoto &&
    previous.onEdit === next.onEdit &&
    previous.onDelete === next.onDelete &&
    previous.onShare === next.onShare &&
    previous.onToggleFavorite === next.onToggleFavorite &&
    previous.event.localEventId === next.event.localEventId &&
    previous.event.caption === next.event.caption &&
    previous.event.eventType === next.event.eventType &&
    previous.event.isFavorite === next.event.isFavorite &&
    previous.event.timestamp === next.event.timestamp &&
    eventMediaSignature(previous.event.media) ===
      eventMediaSignature(next.event.media)
  );
}

export const TimelineMomentCard = memo(
  TimelineMomentCardComponent,
  areTimelineMomentCardPropsEqual,
);

function MomentImage({
  media,
  onPress,
}: {
  media: TimelineEventMedia;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createTimelineMomentCardStyles);

  return (
    <Pressable
      accessibilityLabel={t('accessibility.momentPhoto')}
      accessibilityRole="button"
      style={styles.imageFrame}
      onPress={onPress}
    >
      <Image
        contentFit="cover"
        source={{ uri: media.uri }}
        style={styles.secondaryImage}
      />
    </Pressable>
  );
}
