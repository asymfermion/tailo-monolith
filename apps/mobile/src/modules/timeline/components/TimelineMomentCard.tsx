import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaDetectionDebugBadge } from '@/components/MediaDetectionDebugBadge';
import { colors, spacing } from '@/constants/theme';
import { formatEventType, formatTimestamp } from '@/lib/formatMoment';
import { t, useAppLocale } from '@/i18n';
import type { TimelineEvent, TimelineEventMedia } from '@/types';

import { MomentActionMenu } from './MomentActionMenu';

type TimelineMomentCardProps = {
  event: TimelineEvent;
  onDelete: (localEventId: string) => void;
  onEdit: (localEventId: string) => void;
  onPress: (localEventId: string) => void;
  onShare: (localEventId: string) => void;
  onToggleFavorite: (localEventId: string, isFavorite: boolean) => void;
};

function TimelineMomentCardComponent({
  event,
  onDelete,
  onEdit,
  onPress,
  onShare,
  onToggleFavorite,
}: TimelineMomentCardProps) {
  useAppLocale();
  const primaryMedia =
    event.media.find((media) => media.isPrimary) ?? event.media[0];
  const secondaryMedia = event.media
    .filter((media) => media.localAssetId !== primaryMedia?.localAssetId)
    .slice(0, 4);

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
            <Ionicons color={colors.textMuted} name="share-outline" size={22} />
          </Pressable>
          <MomentActionMenu
            onDelete={() => onDelete(event.localEventId)}
            onEdit={() => onEdit(event.localEventId)}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(event.localEventId)}
      >
        {primaryMedia ? (
          <View style={styles.mediaGrid}>
            <View style={styles.imageFrame}>
              <Image
                accessibilityLabel={t('accessibility.primaryMomentPhoto')}
                contentFit="cover"
                source={{ uri: primaryMedia.uri }}
                style={styles.primaryImage}
              />
              <MediaDetectionDebugBadge media={primaryMedia} />
            </View>
            {secondaryMedia.length > 0 ? (
              <View style={styles.secondaryGrid}>
                {secondaryMedia.map((media) => (
                  <MomentImage key={media.localAssetId} media={media} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {event.caption ? (
          <Text style={styles.caption}>{event.caption}</Text>
        ) : null}
      </Pressable>
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

function MomentImage({ media }: { media: TimelineEventMedia }) {
  return (
    <View style={styles.imageFrame}>
      <Image
        accessibilityLabel={t('accessibility.momentPhoto')}
        contentFit="cover"
        source={{ uri: media.uri }}
        style={styles.secondaryImage}
      />
      <MediaDetectionDebugBadge compact media={media} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerMain: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  momentType: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  momentTime: {
    color: colors.textMuted,
    fontSize: 13,
  },
  caption: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  mediaGrid: {
    gap: spacing.sm,
  },
  imageFrame: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  primaryImage: {
    aspectRatio: 1.16,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryImage: {
    aspectRatio: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: colors.border,
  },
});
