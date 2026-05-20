import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { colors } from '@/constants/theme';

import type { ModalRoute } from '../routes';
import {
  MODAL_PUSH_DURATION_MS,
  getModalDismissTargetX,
} from '../modalSwipeBack';
import { ModalSwipeBack } from './ModalSwipeBack';
import { MainTabShell } from '../MainTabShell';
import { ModalShell } from '../ModalShell';

type ModalStackLayerProps = {
  activeModal: ModalRoute | undefined;
  onPop: () => void;
};

const FALLBACK_WIDTH = Dimensions.get('window').width;

export function ModalStackLayer({ activeModal, onPop }: ModalStackLayerProps) {
  const dragX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(FALLBACK_WIDTH);

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
      <View style={styles.underlay}>
        <MainTabShell />
      </View>

      {activeModal ? (
        <View pointerEvents="box-none" style={styles.modalLayer}>
          <ModalSwipeBack
            containerWidth={containerWidth}
            dragX={dragX}
            modalKey={modalKey}
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

const styles = StyleSheet.create({
  stack: {
    backgroundColor: colors.background,
    flex: 1,
    overflow: 'hidden',
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
    shadowColor: '#000000',
    shadowOffset: { width: -6, height: 0 },
    shadowRadius: 14,
  },
});
