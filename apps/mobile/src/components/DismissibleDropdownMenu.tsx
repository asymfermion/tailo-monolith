import { useCallback, useRef, type ReactNode } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type View as ViewType,
} from 'react-native';

import { spacing } from '@/constants/theme';

export type DropdownAnchor = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type DismissibleDropdownMenuProps = {
  children: ReactNode;
  onDismiss: () => void;
  visible: boolean;
  anchor: DropdownAnchor | null;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export function useDropdownAnchor() {
  const anchorRef = useRef<ViewType>(null);

  const measureAnchor = useCallback(
    (onMeasured: (anchor: DropdownAnchor) => void) => {
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        onMeasured({ x, y, width, height });
      });
    },
    [],
  );

  return { anchorRef, measureAnchor };
}

export function DismissibleDropdownMenu({
  anchor,
  children,
  onDismiss,
  visible,
}: DismissibleDropdownMenuProps) {
  if (!visible || anchor === null) {
    return null;
  }

  return (
    <Modal transparent animationType="none" visible onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
        />
        <View
          pointerEvents="box-none"
          style={[
            styles.menu,
            {
              right: SCREEN_WIDTH - anchor.x - anchor.width,
              top: anchor.y + anchor.height + spacing.xs,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
  },
});
