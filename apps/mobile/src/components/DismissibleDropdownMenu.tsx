import { useCallback, useRef, type ReactNode } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type View as ViewType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';

import { BlurScrim } from './BlurScrim';

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
  /** Minimum menu width when the measured anchor is too narrow. */
  minMenuWidth?: number;
  /** When false, only a transparent tap-outside layer is shown (e.g. timeline filter). */
  blurBackdrop?: boolean;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MENU_GAP = spacing.xs;
const DEFAULT_MIN_MENU_WIDTH = 220;
const MEASURE_MAX_ATTEMPTS = 4;
/** Minimum menu height before preferring the other side or heavy clipping. */
const MIN_MENU_HEIGHT = 120;

export type DropdownMenuPlacement = {
  maxHeight: number;
  openBelow: boolean;
};

export function getDropdownMenuPlacement(
  anchor: DropdownAnchor,
  insets: { top: number; bottom: number },
): DropdownMenuPlacement {
  const spaceBelow =
    SCREEN_HEIGHT - insets.bottom - (anchor.y + anchor.height + MENU_GAP);
  const spaceAbove = anchor.y - insets.top - MENU_GAP;
  const openBelow = spaceBelow >= spaceAbove;

  return {
    openBelow,
    maxHeight: Math.max(openBelow ? spaceBelow : spaceAbove, MIN_MENU_HEIGHT),
  };
}

export function resolveDropdownMenuFrame(
  anchor: DropdownAnchor,
  minMenuWidth = DEFAULT_MIN_MENU_WIDTH,
): { left: number; width: number } {
  const width = Math.max(anchor.width, minMenuWidth);
  const maxLeft = Math.max(spacing.md, SCREEN_WIDTH - width - spacing.md);
  const left = Math.min(Math.max(anchor.x, spacing.md), maxLeft);

  return { left, width };
}

function readAnchorFromWindow(
  node: ViewType,
  onMeasured: (anchor: DropdownAnchor) => void,
  attempt: number,
  minMenuWidth: number,
): void {
  node.measureInWindow((x, y, width, height) => {
    if (width > 0 && height > 0) {
      onMeasured({ x, y, width, height });
      return;
    }

    if (attempt < MEASURE_MAX_ATTEMPTS) {
      requestAnimationFrame(() =>
        readAnchorFromWindow(node, onMeasured, attempt + 1, minMenuWidth),
      );
      return;
    }

    onMeasured({
      x: spacing.lg,
      y: Math.max(SCREEN_HEIGHT * 0.35, spacing.xl),
      width: SCREEN_WIDTH - spacing.lg * 2,
      height: 48,
    });
  });
}

export function useDropdownAnchor(minMenuWidth = DEFAULT_MIN_MENU_WIDTH) {
  const anchorRef = useRef<ViewType>(null);

  const measureAnchor = useCallback(
    (onMeasured: (anchor: DropdownAnchor) => void) => {
      const node = anchorRef.current;

      if (!node) {
        onMeasured({
          x: spacing.lg,
          y: Math.max(SCREEN_HEIGHT * 0.35, spacing.xl),
          width: SCREEN_WIDTH - spacing.lg * 2,
          height: 48,
        });
        return;
      }

      requestAnimationFrame(() =>
        readAnchorFromWindow(node, onMeasured, 0, minMenuWidth),
      );
    },
    [minMenuWidth],
  );

  return { anchorRef, measureAnchor };
}

export function DismissibleDropdownMenu({
  anchor,
  blurBackdrop = true,
  children,
  minMenuWidth = DEFAULT_MIN_MENU_WIDTH,
  onDismiss,
  visible,
}: DismissibleDropdownMenuProps) {
  const insets = useSafeAreaInsets();

  if (!visible || anchor === null) {
    return null;
  }

  const { maxHeight, openBelow } = getDropdownMenuPlacement(anchor, insets);
  const { left, width } = resolveDropdownMenuFrame(anchor, minMenuWidth);

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <View style={styles.overlay}>
        {blurBackdrop ? (
          <BlurScrim onDismiss={onDismiss} />
        ) : (
          <Pressable
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
          />
        )}
        <View
          pointerEvents="box-none"
          style={[
            styles.menu,
            {
              left,
              maxHeight,
              width,
              zIndex: 1,
            },
            openBelow
              ? { top: anchor.y + anchor.height + MENU_GAP }
              : { bottom: SCREEN_HEIGHT - anchor.y + MENU_GAP },
          ]}
        >
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={{ maxHeight }}
          >
            {children}
          </ScrollView>
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
