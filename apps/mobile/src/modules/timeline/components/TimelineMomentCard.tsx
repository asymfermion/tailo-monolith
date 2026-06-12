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
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      overflow: 'hidden' as const,
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
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 23,
      fontWeight: '600' as const,
      lineHeight: 29,
    },
    momentTime: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
    },
    storyBody: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    caption: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 23,
    },
    mediaGrid: {
      gap: spacing.sm,
      padding: spacing.md,
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
    favoriteOverlayButton: {
      alignItems: 'center' as const,
      backgroundColor: 'rgba(255, 255, 255, 0.82)',
      borderRadius: 18,
      height: 36,
      justifyContent: 'center' as const,
      position: 'absolute' as const,
      right: spacing.sm,
      top: spacing.sm,
      width: 36,
    },
    photoCountBadge: {
      backgroundColor: 'rgba(28, 28, 26, 0.58)',
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      position: 'absolute' as const,
      right: spacing.sm,
      top: 52,
    },
    photoCountBadgeText: {
      color: '#FFFFFF',
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
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
    metadataRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
    },
    metadataText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
    },
    metadataDot: {
      backgroundColor: colors.border,
      borderRadius: 2,
      height: 4,
      width: 4,
    },
    cardActionRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.xs,
      marginLeft: 'auto' as const,
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
  const secondaryMedia = event.media.slice(1, 4);
  const photoCount = event.media.length;
  const photoCountLabel =
    photoCount === 1
      ? t('timeline.moment.photoCountSingle')
      : t('timeline.moment.photoCountPlural', { count: String(photoCount) });

  return (
    <View style={styles.card}>
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
              <Pressable
                accessibilityLabel={
                  event.isFavorite
                    ? t('timeline.moment.removeFavorite')
                    : t('timeline.moment.addFavorite')
                }
                accessibilityRole="button"
                hitSlop={8}
                style={styles.favoriteOverlayButton}
                onPress={() =>
                  onToggleFavorite(event.localEventId, !event.isFavorite)
                }
              >
                <Ionicons
                  color={event.isFavorite ? colors.accent : colors.text}
                  name={event.isFavorite ? 'heart' : 'heart-outline'}
                  size={21}
                />
              </Pressable>
              {photoCount > 1 ? (
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountBadgeText}>
                    {photoCountLabel}
                  </Text>
                </View>
              ) : null}
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

      <Pressable
        accessibilityRole="button"
        style={styles.storyBody}
        onPress={() => onPress(event.localEventId)}
      >
        <Text style={styles.momentType}>
          {formatEventType(event.eventType)}
        </Text>
        {event.caption ? (
          <Text style={styles.caption}>{event.caption}</Text>
        ) : null}
      </Pressable>

      <View style={styles.metadataRow}>
        <Text style={styles.metadataText}>
          {formatTimestamp(event.timestamp)}
        </Text>
        <View style={styles.metadataDot} />
        <Text style={styles.metadataText}>{photoCountLabel}</Text>
        <View style={styles.cardActionRow}>
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
              size={20}
            />
          </Pressable>
          <MomentActionMenu
            onDelete={() => onDelete(event.localEventId)}
            onEdit={() => onEdit(event.localEventId)}
          />
        </View>
      </View>
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
