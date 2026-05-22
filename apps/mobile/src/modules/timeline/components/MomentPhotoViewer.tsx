import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import type { TimelineEventMedia } from '@/types';

import {
  isVerticalDismissGesture,
  shouldDismissPhotoViewer,
} from './momentPhotoViewerDismiss';

export type MomentPhotoViewerProps = {
  visible: boolean;
  media: TimelineEventMedia[];
  initialIndex: number;
  onClose: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_DRAG_DISTANCE = SCREEN_HEIGHT * 0.28;
const DISMISS_ANIMATION_MS = 280;
const DISMISS_EASING = Easing.out(Easing.cubic);

function dismissDragProgress(translationY: number): number {
  return Math.min(1, Math.abs(translationY) / DISMISS_DRAG_DISTANCE);
}

function createMomentPhotoViewerStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: 'transparent',
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
    },
    content: {
      flex: 1,
    },
    page: {
      alignItems: 'center' as const,
      backgroundColor: 'transparent',
      height: '100%' as const,
      justifyContent: 'center' as const,
      width: SCREEN_WIDTH,
    },
    image: {
      height: '100%' as const,
      width: '100%' as const,
    },
    chrome: {
      left: 0,
      paddingHorizontal: spacing.lg,
      position: 'absolute' as const,
      right: 0,
      top: 0,
    },
    chromeRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    chromeSpacer: {
      flex: 1,
    },
    chromeActions: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    chromeButton: {
      alignItems: 'center' as const,
      backgroundColor: 'rgba(28, 28, 26, 0.55)',
      borderRadius: 20,
      height: 40,
      justifyContent: 'center' as const,
      width: 40,
    },
    pageIndicator: {
      color: colors.surface,
      flex: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
  };
}

export function MomentPhotoViewer({
  visible,
  media,
  initialIndex,
  onClose,
}: MomentPhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createMomentPhotoViewerStyles);
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [horizontalScrollEnabled, setHorizontalScrollEnabled] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const touchStart = useRef({ x: 0, y: 0 });
  const isVerticalDrag = useRef(false);
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
      backdropOpacity.setValue(0);
      contentOpacity.setValue(0);
      contentScale.setValue(1);
      return;
    }

    setActiveIndex(initialIndex);
    setHorizontalScrollEnabled(true);
    translateY.setValue(0);
    contentScale.setValue(1);
    backdropOpacity.setValue(0);
    contentOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: DISMISS_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 240,
        easing: DISMISS_EASING,
        useNativeDriver: true,
      }),
    ]).start();

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: initialIndex * SCREEN_WIDTH,
        animated: false,
      });
    });
  }, [
    visible,
    initialIndex,
    media.length,
    translateY,
    backdropOpacity,
    contentOpacity,
    contentScale,
  ]);

  const applyDismissDrag = useCallback(
    (translationY: number) => {
      const progress = dismissDragProgress(translationY);
      translateY.setValue(translationY);
      backdropOpacity.setValue(1 - progress);
      contentScale.setValue(1 - progress * 0.06);
    },
    [backdropOpacity, contentScale, translateY],
  );

  const finishClose = useCallback(() => {
    setHorizontalScrollEnabled(true);
    requestAnimationFrame(() => {
      onClose();
    });
  }, [onClose]);

  const animateDismiss = useCallback(
    (direction: 1 | -1) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: direction * SCREEN_HEIGHT,
          duration: DISMISS_ANIMATION_MS,
          easing: DISMISS_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: DISMISS_ANIMATION_MS,
          easing: DISMISS_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: DISMISS_ANIMATION_MS,
          easing: DISMISS_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 0.88,
          duration: DISMISS_ANIMATION_MS,
          easing: DISMISS_EASING,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          finishClose();
        }
      });
    },
    [backdropOpacity, contentOpacity, contentScale, finishClose, translateY],
  );

  const resetDismissDrag = useCallback(() => {
    setHorizontalScrollEnabled(true);
    isVerticalDrag.current = false;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: DISMISS_ANIMATION_MS,
        easing: DISMISS_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: DISMISS_ANIMATION_MS,
        easing: DISMISS_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: DISMISS_ANIMATION_MS,
        easing: DISMISS_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, contentOpacity, contentScale, translateY]);

  const handleClosePress = useCallback(() => {
    animateDismiss(1);
  }, [animateDismiss]);

  const handleEditPress = useCallback(() => {
    Alert.alert(
      t('timeline.moment.editPhotoSoonTitle'),
      t('timeline.moment.editPhotoSoonMessage'),
    );
  }, []);

  const handleTouchStart = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      return;
    }

    touchStart.current = { x: touch.pageX, y: touch.pageY };
    lastTouchY.current = touch.pageY;
    lastTouchTime.current = Date.now();
    isVerticalDrag.current = false;
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      return;
    }

    const dx = touch.pageX - touchStart.current.x;
    const dy = touch.pageY - touchStart.current.y;

    if (!isVerticalDrag.current && isVerticalDismissGesture(dx, dy)) {
      isVerticalDrag.current = true;
      setHorizontalScrollEnabled(false);
    }

    if (!isVerticalDrag.current) {
      return;
    }

    applyDismissDrag(dy);
    lastTouchY.current = touch.pageY;
    lastTouchTime.current = Date.now();
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    if (!isVerticalDrag.current) {
      return;
    }

    const touch = event.nativeEvent.changedTouches[0];
    if (!touch) {
      resetDismissDrag();
      return;
    }

    const dy = touch.pageY - touchStart.current.y;
    const dt = Math.max(1, Date.now() - lastTouchTime.current);
    const velocityY = ((touch.pageY - lastTouchY.current) / dt) * 1000;

    if (shouldDismissPhotoViewer(dy, velocityY)) {
      animateDismiss(dy >= 0 ? 1 : -1);
      return;
    }

    resetDismissDrag();
  };

  const handleTouchCancel = () => {
    if (isVerticalDrag.current) {
      resetDismissDrag();
    }
  };

  if (!visible) {
    return null;
  }

  if (media.length === 0) {
    return null;
  }

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(Math.min(Math.max(index, 0), media.length - 1));
  };

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleClosePress}
    >
      <View style={styles.screen}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY }, { scale: contentScale }],
            },
          ]}
          onTouchCancel={handleTouchCancel}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            directionalLockEnabled
            pagingEnabled
            scrollEnabled={horizontalScrollEnabled}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
          >
            {media.map((item) => (
              <View key={item.localAssetId} style={styles.page}>
                <Image
                  pointerEvents="none"
                  accessibilityLabel={t('accessibility.momentPhoto')}
                  contentFit="contain"
                  source={{ uri: item.uri }}
                  style={styles.image}
                />
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.chrome,
            {
              opacity: backdropOpacity,
              paddingTop: insets.top + spacing.sm,
            },
          ]}
        >
          <View style={styles.chromeRow}>
            {media.length > 1 ? (
              <Text style={styles.pageIndicator}>
                {t('timeline.moment.photoViewerIndex', {
                  current: activeIndex + 1,
                  total: media.length,
                })}
              </Text>
            ) : (
              <View style={styles.chromeSpacer} />
            )}
            <View style={styles.chromeActions}>
              <Pressable
                accessibilityLabel={t('timeline.moment.editPhoto')}
                accessibilityRole="button"
                hitSlop={12}
                style={styles.chromeButton}
                onPress={handleEditPress}
              >
                <Ionicons
                  color={colors.surface}
                  name="brush-outline"
                  size={24}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={t('common.back')}
                accessibilityRole="button"
                hitSlop={12}
                style={styles.chromeButton}
                onPress={handleClosePress}
              >
                <Ionicons color={colors.surface} name="close" size={28} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
