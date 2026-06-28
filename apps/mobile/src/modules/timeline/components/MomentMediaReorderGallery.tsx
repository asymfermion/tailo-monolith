import { useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import type { TimelineEventMedia } from '@/types';

import { moveAssetToIndex } from '../reorderMomentMedia';

/** Fixed row geometry so a drag distance maps cleanly to a target index. */
const ROW_HEIGHT = 84;
const ROW_GAP = spacing.sm;
const ROW_TOTAL = ROW_HEIGHT + ROW_GAP;

type MomentMediaReorderGalleryProps = {
  media: TimelineEventMedia[];
  isSaving: boolean;
  onReorder: (orderedAssetIds: string[]) => void;
};

function createMomentMediaReorderGalleryStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    gallery: {
      gap: ROW_GAP,
      marginTop: spacing.lg,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    hint: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginBottom: spacing.xs,
    },
    row: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row' as const,
      gap: spacing.md,
      height: ROW_HEIGHT,
      paddingHorizontal: spacing.sm + 2,
    },
    thumb: {
      backgroundColor: colors.border,
      borderRadius: 10,
      height: 64,
      width: 64,
    },
    rowBody: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    rowLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    coverTag: {
      color: colors.textMuted,
      fontFamily: getFontFamily('500'),
      fontSize: 12,
      fontWeight: '500' as const,
    },
    handle: {
      alignItems: 'center' as const,
      height: 44,
      justifyContent: 'center' as const,
      width: 36,
    },
  };
}

export function MomentMediaReorderGallery({
  media,
  isSaving,
  onReorder,
}: MomentMediaReorderGalleryProps) {
  const styles = useThemedStyles(createMomentMediaReorderGalleryStyles);
  const canReorder = media.length > 1 && !isSaving;

  const commitMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      const orderedIds = media.map((item) => item.localAssetId);
      const nextIds = moveAssetToIndex(orderedIds, fromIndex, toIndex);

      if (nextIds) {
        onReorder(nextIds);
      }
    },
    [media, onReorder],
  );

  if (media.length === 0) {
    return null;
  }

  return (
    <View style={styles.gallery}>
      <Text style={styles.sectionLabel}>{t('eventDetail.photosSection')}</Text>
      <Text style={styles.hint}>{t('eventDetail.photosReorderHint')}</Text>
      {media.map((item, index) => (
        <MediaReorderRow
          key={item.localAssetId}
          count={media.length}
          index={index}
          item={item}
          canReorder={canReorder}
          onCommit={commitMove}
          styles={styles}
        />
      ))}
    </View>
  );
}

type MediaReorderRowProps = {
  item: TimelineEventMedia;
  index: number;
  count: number;
  canReorder: boolean;
  onCommit: (fromIndex: number, toIndex: number) => void;
  styles: ReturnType<typeof createMomentMediaReorderGalleryStyles>;
};

function MediaReorderRow({
  item,
  index,
  count,
  canReorder,
  onCommit,
  styles,
}: MediaReorderRowProps) {
  const { colors } = useAppearance();
  const dragY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const isCover = index === 0;

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canReorder)
        .activateAfterLongPress(180)
        .onStart(() => {
          isActive.value = true;
          dragY.value = 0;
        })
        .onUpdate((event) => {
          dragY.value = event.translationY;
        })
        .onEnd((event) => {
          const delta = Math.round(event.translationY / ROW_TOTAL);
          if (delta !== 0) {
            runOnJS(onCommit)(index, index + delta);
          }
        })
        .onFinalize(() => {
          isActive.value = false;
          dragY.value = 0;
        }),
    [canReorder, dragY, index, isActive, onCommit],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: isActive.value ? dragY.value : 0 },
      { scale: isActive.value ? 1.03 : 1 },
    ],
    zIndex: isActive.value ? 10 : 0,
  }));

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'moveUp') {
        onCommit(index, index - 1);
      } else if (event.nativeEvent.actionName === 'moveDown') {
        onCommit(index, index + 1);
      }
    },
    [index, onCommit],
  );

  const accessibilityActions = [
    ...(index > 0
      ? [{ name: 'moveUp', label: t('eventDetail.movePhotoUp') }]
      : []),
    ...(index < count - 1
      ? [{ name: 'moveDown', label: t('eventDetail.movePhotoDown') }]
      : []),
  ];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        accessibilityActions={accessibilityActions}
        accessibilityHint={
          canReorder ? t('eventDetail.photosReorderHint') : undefined
        }
        accessibilityLabel={
          isCover
            ? t('accessibility.primaryMomentPhoto')
            : t('accessibility.momentPhoto')
        }
        accessibilityRole="adjustable"
        style={[styles.row, animatedStyle]}
        onAccessibilityAction={handleAccessibilityAction}
      >
        <Image
          contentFit="cover"
          source={{ uri: item.uri }}
          style={styles.thumb}
        />
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel}>
            {isCover
              ? t('eventDetail.coverPhoto')
              : t('eventDetail.photoNumber', { number: String(index + 1) })}
          </Text>
          {isCover ? (
            <Text style={styles.coverTag}>{t('eventDetail.coverHint')}</Text>
          ) : null}
        </View>
        {count > 1 ? (
          <View style={styles.handle}>
            <Ionicons color={colors.textMuted} name="reorder-three" size={26} />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}
