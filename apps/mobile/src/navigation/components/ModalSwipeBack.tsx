import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getModalSwipeHeaderExclusion } from '../modalHeaderInset';
import {
  MODAL_POP_DURATION_MS,
  MODAL_SWIPE_EDGE_WIDTH,
  getModalDismissTargetX,
  shouldPopOnSwipeRight,
} from '../modalSwipeBack';
import { ModalDismissContext } from './ModalDismissContext';

type ModalSwipeBackProps = {
  children: ReactNode;
  containerWidth: number;
  dragX: Animated.Value;
  enabled?: boolean;
  modalKey: string;
  onBack: () => void;
};

export function ModalSwipeBack({
  children,
  containerWidth,
  dragX,
  enabled = true,
  modalKey,
  onBack,
}: ModalSwipeBackProps) {
  const insets = useSafeAreaInsets();
  const headerExclusion = getModalSwipeHeaderExclusion(insets.top);
  const isDismissing = useRef(false);
  const touchStartPageX = useRef(0);

  const dismissTargetX = getModalDismissTargetX(containerWidth);

  useEffect(() => {
    isDismissing.current = false;
    touchStartPageX.current = 0;
  }, [modalKey]);

  const dismiss = useCallback(() => {
    if (isDismissing.current) {
      onBack();
      return;
    }

    isDismissing.current = true;
    dragX.stopAnimation();

    Animated.timing(dragX, {
      duration: MODAL_POP_DURATION_MS,
      toValue: dismissTargetX,
      useNativeDriver: true,
    }).start(() => {
      isDismissing.current = false;
      onBack();
    });
  }, [dragX, dismissTargetX, onBack]);

  const resetDrag = useCallback(() => {
    if (isDismissing.current) {
      return;
    }

    Animated.spring(dragX, {
      bounciness: 0,
      speed: 24,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [dragX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (!enabled || isDismissing.current) {
            return false;
          }

          if (touchStartPageX.current > MODAL_SWIPE_EDGE_WIDTH) {
            return false;
          }

          return (
            gesture.dx > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.75
          );
        },
        onPanResponderGrant: (event) => {
          touchStartPageX.current = event.nativeEvent.pageX;
          dragX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          dragX.setValue(Math.min(dismissTargetX, Math.max(0, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          touchStartPageX.current = 0;

          if (shouldPopOnSwipeRight(gesture.dx, gesture.vx, containerWidth)) {
            dismiss();
            return;
          }

          resetDrag();
        },
        onPanResponderTerminate: () => {
          touchStartPageX.current = 0;
          resetDrag();
        },
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponder: (event) => {
          if (!enabled || isDismissing.current) {
            return false;
          }

          touchStartPageX.current = event.nativeEvent.pageX;
          return touchStartPageX.current <= MODAL_SWIPE_EDGE_WIDTH;
        },
      }),
    [containerWidth, dismiss, dismissTargetX, dragX, enabled, resetDrag],
  );

  return (
    <ModalDismissContext.Provider value={dismiss}>
      <View pointerEvents="box-none" style={styles.container}>
        {children}
        {enabled ? (
          <View
            pointerEvents="box-only"
            style={[styles.edgeHitTarget, { top: headerExclusion }]}
            {...panResponder.panHandlers}
          />
        ) : null}
      </View>
    </ModalDismissContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  edgeHitTarget: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    width: MODAL_SWIPE_EDGE_WIDTH,
    zIndex: 10,
  },
});
