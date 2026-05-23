import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BlurScrim } from './BlurScrim';

type ModalBlurBackdropProps = {
  children: ReactNode;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Full-screen blurred scrim for centered modal content. */
export function ModalBlurBackdrop({
  children,
  onDismiss,
  style,
}: ModalBlurBackdropProps) {
  return (
    <View style={[styles.root, style]}>
      <BlurScrim onDismiss={onDismiss} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
