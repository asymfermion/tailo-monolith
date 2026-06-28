import { memo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

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

/** Cover carousel shows at most this many page dots when a moment has many photos. */
const MAX_PAGE_DOTS = 8;

function createTimelineMomentCardStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    card: {
      backgroundColor: colors.surface,
      overflow: 'hidden' as const,
    },
    hero: {
      aspectRatio: 1.3,
      backgroundColor: colors.border,
      width: '100%' as const,
    },
    content: {
      gap: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: 14,
    },
    titleRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    titleTap: {
      flex: 1,
      minWidth: 0,
    },
    momentType: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    favoriteButton: {
      alignItems: 'center' as const,
      height: 40,
      justifyContent: 'center' as const,
      marginRight: -spacing.sm,
      width: 40,
    },
    caption: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 23,
    },
    heroDotsWrap: {
      alignItems: 'center' as const,
      bottom: spacing.sm,
      left: 0,
      position: 'absolute' as const,
      right: 0,
    },
    heroDots: {
      alignItems: 'center' as const,
      backgroundColor: 'rgba(21, 20, 18, 0.32)',
      borderRadius: 999,
      flexDirection: 'row' as const,
      gap: 5,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
    },
    heroDot: {
      backgroundColor: 'rgba(255, 255, 255, 0.55)',
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    heroDotActive: {
      backgroundColor: '#FFFFFF',
    },
    metadataRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      paddingTop: spacing.xs,
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
    iconButton: {
      alignItems: 'center' as const,
      height: 40,
      justifyContent: 'center' as const,
      width: 40,
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
  const photoCount = event.media.length;
  const photoCountLabel =
    photoCount === 1
      ? t('timeline.moment.photoCountSingle')
      : t('timeline.moment.photoCountPlural', { count: String(photoCount) });

  return (
    <View style={styles.card}>
      {photoCount > 0 ? (
        <MomentHeroCarousel
          media={event.media}
          styles={styles}
          onPressPhoto={(index) => onPressPhoto(event, index)}
        />
      ) : null}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Pressable
            accessibilityRole="button"
            style={styles.titleTap}
            onPress={() => onPress(event.localEventId)}
          >
            <Text numberOfLines={2} style={styles.momentType}>
              {formatEventType(event.eventType)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={
              event.isFavorite
                ? t('timeline.moment.removeFavorite')
                : t('timeline.moment.addFavorite')
            }
            accessibilityRole="button"
            hitSlop={8}
            style={styles.favoriteButton}
            onPress={() =>
              onToggleFavorite(event.localEventId, !event.isFavorite)
            }
          >
            <Ionicons
              color={event.isFavorite ? colors.favorite : colors.textMuted}
              name={event.isFavorite ? 'heart' : 'heart-outline'}
              size={22}
            />
          </Pressable>
        </View>

        {event.caption ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onPress(event.localEventId)}
          >
            <Text style={styles.caption}>{event.caption}</Text>
          </Pressable>
        ) : null}

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
    </View>
  );
}

type MomentHeroCarouselProps = {
  media: TimelineEventMedia[];
  styles: ReturnType<typeof createTimelineMomentCardStyles>;
  onPressPhoto: (index: number) => void;
};

/**
 * Swipeable cover carousel. A nested horizontal pager lets the user page
 * through the moment's photos without the swipe reaching the tab pager; a tap
 * opens the full-screen viewer at the visible photo.
 */
function MomentHeroCarousel({
  media,
  styles,
  onPressPhoto,
}: MomentHeroCarouselProps) {
  const window = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(window.width);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = media.length > 1;
  const dotCount = Math.min(media.length, MAX_PAGE_DOTS);
  const activeDot = Math.min(activeIndex, dotCount - 1);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (pageWidth <= 0) {
      return;
    }

    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setActiveIndex(Math.min(Math.max(index, 0), media.length - 1));
  };

  return (
    <View
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0) {
          setPageWidth(width);
        }
      }}
    >
      <ScrollView
        horizontal
        directionalLockEnabled
        nestedScrollEnabled
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {media.map((item, index) => (
          <Pressable
            key={item.localAssetId}
            accessibilityLabel={
              index === 0
                ? t('accessibility.primaryMomentPhoto')
                : t('accessibility.momentPhoto')
            }
            accessibilityRole="button"
            style={{ width: pageWidth }}
            onPress={() => onPressPhoto(index)}
          >
            <Image
              contentFit="cover"
              source={{ uri: item.uri }}
              style={styles.hero}
            />
          </Pressable>
        ))}
      </ScrollView>
      {hasMultiple ? (
        <View style={styles.heroDotsWrap} pointerEvents="none">
          <View style={styles.heroDots}>
            {Array.from({ length: dotCount }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.heroDot,
                  index === activeDot && styles.heroDotActive,
                ]}
              />
            ))}
          </View>
        </View>
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
