import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaDetectionDebugBadge } from '@/components/MediaDetectionDebugBadge';
import { colors, spacing } from '@/constants/theme';
import { formatEventType, formatTimestamp } from '@/lib/formatMoment';
import { t } from '@/i18n';
import type { TimelineEvent, TimelineEventMedia } from '@/types';

type TimelineMomentCardProps = {
  event: TimelineEvent;
  onPress: (localEventId: string) => void;
};

export function TimelineMomentCard({
  event,
  onPress,
}: TimelineMomentCardProps) {
  const primaryMedia =
    event.media.find((media) => media.isPrimary) ?? event.media[0];
  const secondaryMedia = event.media
    .filter((media) => media.localAssetId !== primaryMedia?.localAssetId)
    .slice(0, 4);

  return (
    <Pressable
      accessibilityRole="button"
      style={styles.moment}
      onPress={() => onPress(event.localEventId)}
    >
      <View style={styles.momentMetaRow}>
        <View style={styles.momentMetaLeft}>
          {event.isFavorite ? <Text style={styles.favoriteMark}>★</Text> : null}
          <Text style={styles.momentType}>
            {formatEventType(event.eventType)}
          </Text>
        </View>
        <Text style={styles.momentTime}>
          {formatTimestamp(event.timestamp)}
        </Text>
      </View>
      <Text style={styles.caption}>{event.caption}</Text>

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
    </Pressable>
  );
}

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
  moment: {
    marginTop: spacing.xl,
  },
  momentMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  momentMetaLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  favoriteMark: {
    color: colors.accent,
    fontSize: 14,
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
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 27,
  },
  mediaGrid: {
    marginTop: spacing.md,
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
