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
import { ModalSwipeBack } from './ModalSwipeBack';
import { ModalShell } from '../ModalShell';

type ModalStackLayerProps = {
  activeModal: ModalRoute | undefined;
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
      ...StyleSheet.absoluteFillObject,
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

export function ModalStackLayer({
  activeModal,
  onPop,
  underlay,
}: ModalStackLayerProps) {
  const dragX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(FALLBACK_WIDTH);
  const styles = useThemedStyles(createModalStackLayerStyles);

  const modalKey = activeModal
    ? `${activeModal.name}:${JSON.stringify(activeModal.params ?? {})}`
    : null;

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;

    if (width > 0) {
      setContainerWidth(width);
    }
  };

  useEffect(() => {
    if (!modalKey) {
      dragX.setValue(0);
      return;
    }

    const openFromX = getModalDismissTargetX(containerWidth);
    dragX.setValue(openFromX);
    Animated.timing(dragX, {
      duration: MODAL_PUSH_DURATION_MS,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [containerWidth, dragX, modalKey]);

  const cardShadowOpacity = dragX.interpolate({
    extrapolate: 'clamp',
    inputRange: [0, 20],
    outputRange: [0.16, 0],
  });

  return (
    <View onLayout={handleLayout} style={styles.stack}>
      <View style={styles.underlay}>{underlay}</View>

      {activeModal ? (
        <View pointerEvents="box-none" style={styles.modalLayer}>
          <ModalSwipeBack
            containerWidth={containerWidth}
            dragX={dragX}
            modalKey={modalKey!}
            onBack={onPop}
          >
            <Animated.View
              style={[
                styles.modalCard,
                {
                  shadowOpacity: cardShadowOpacity,
                  transform: [{ translateX: dragX }],
                },
              ]}
            >
              <ModalShell route={activeModal} />
            </Animated.View>
          </ModalSwipeBack>
        </View>
      ) : null}
    </View>
  );
}
