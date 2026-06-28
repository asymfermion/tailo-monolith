import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

import type { ModalRoute } from '../routes';
import {
  MODAL_PUSH_DURATION_MS,
  getModalDismissTargetX,
} from '../modalSwipeBack';
import {
  pruneSeenModalKeys,
  shouldAnimateModalEntry,
} from '../modalStackAnimation';
import { ModalSwipeBack } from './ModalSwipeBack';
import { ModalShell } from '../ModalShell';

type ModalStackLayerProps = {
  modalStack: ModalRoute[];
  onPop: () => void;
  underlay: ReactNode;
};

const FALLBACK_WIDTH = Dimensions.get('window').width;

function createModalStackLayerStyles({ colors }: AppearanceContextValue) {
  return {
    stack: {
      backgroundColor: colors.background,
      flex: 1,
      overflow: 'hidden' as const,
    },
    underlay: {
      flex: 1,
    },
    modalLayer: {
      ...StyleSheet.absoluteFill,
    },
    modalCard: {
      backgroundColor: colors.background,
      flex: 1,
      shadowColor: colors.shadow,
      shadowOffset: { width: -6, height: 0 },
      shadowRadius: 14,
    },
  };
}

type ModalStackEntryProps = {
  animateIn: boolean;
  containerWidth: number;
  isTop: boolean;
  onPop: () => void;
  route: ModalRoute;
  styles: ReturnType<typeof createModalStackLayerStyles>;
};

function ModalStackEntry({
  animateIn,
  containerWidth,
  isTop,
  onPop,
  route,
  styles,
}: ModalStackEntryProps) {
  const dragX = useRef(new Animated.Value(0)).current;
  const hasPlayedEntryAnimationRef = useRef(false);

  useEffect(() => {
    hasPlayedEntryAnimationRef.current = false;
  }, [route.key]);

  useEffect(() => {
    if (!isTop) {
      dragX.setValue(0);
      return;
    }

    if (!animateIn || hasPlayedEntryAnimationRef.current) {
      dragX.setValue(0);
      return;
    }

    hasPlayedEntryAnimationRef.current = true;
    const openFromX = getModalDismissTargetX(containerWidth);
    dragX.setValue(openFromX);
    Animated.timing(dragX, {
      duration: MODAL_PUSH_DURATION_MS,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [animateIn, containerWidth, dragX, isTop, route.key]);

  const cardShadowOpacity = dragX.interpolate({
    extrapolate: 'clamp',
    inputRange: [0, 20],
    outputRange: [0.16, 0],
  });

  return (
    <View pointerEvents={isTop ? 'box-none' : 'none'} style={styles.modalLayer}>
      <ModalSwipeBack
        containerWidth={containerWidth}
        dragX={dragX}
        enabled={isTop}
        modalKey={route.key}
        onBack={onPop}
      >
        <Animated.View
          style={[
            styles.modalCard,
            {
              shadowOpacity: isTop ? cardShadowOpacity : 0,
              transform: [{ translateX: isTop ? dragX : 0 }],
            },
          ]}
        >
          <ModalShell route={route} />
        </Animated.View>
      </ModalSwipeBack>
    </View>
  );
}

export function ModalStackLayer({
  modalStack,
  onPop,
  underlay,
}: ModalStackLayerProps) {
  const seenModalKeysRef = useRef<Set<string>>(new Set());
  const [containerWidth, setContainerWidth] = useState(FALLBACK_WIDTH);
  const styles = useThemedStyles(createModalStackLayerStyles);

  seenModalKeysRef.current = pruneSeenModalKeys(
    modalStack,
    seenModalKeysRef.current,
  );

  const topModal = modalStack.at(-1);
  const topAnimateIn =
    topModal !== undefined &&
    shouldAnimateModalEntry(topModal.key, seenModalKeysRef.current);

  if (topModal && topAnimateIn) {
    seenModalKeysRef.current.add(topModal.key);
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;

    if (width > 0) {
      setContainerWidth(width);
    }
  };

  return (
    <View onLayout={handleLayout} style={styles.stack}>
      <View style={styles.underlay}>{underlay}</View>

      {modalStack.map((route, index) => (
        <ModalStackEntry
          key={route.key}
          animateIn={route.key === topModal?.key && topAnimateIn}
          containerWidth={containerWidth}
          isTop={index === modalStack.length - 1}
          onPop={onPop}
          route={route}
          styles={styles}
        />
      ))}
    </View>
  );
}
