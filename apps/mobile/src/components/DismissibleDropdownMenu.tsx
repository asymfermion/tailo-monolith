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
  /** Fixed menu width for compact, design-specified menus. */
  menuWidth?: number;
  placement?: 'anchor' | 'center';
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
  menuWidth?: number,
): { left: number; width: number } {
  const width = menuWidth ?? Math.max(anchor.width, minMenuWidth);
  const maxLeft = Math.max(spacing.md, SCREEN_WIDTH - width - spacing.md);
  const left = Math.min(Math.max(anchor.x, spacing.md), maxLeft);

  return { left, width };
}

export function resolveCenteredMenuFrame(
  insets: { top: number; bottom: number },
  minMenuWidth = DEFAULT_MIN_MENU_WIDTH,
  menuWidth?: number,
): { maxHeight: number; width: number } {
  return {
    maxHeight: Math.max(
      SCREEN_HEIGHT - insets.top - insets.bottom - spacing.xl * 2,
      MIN_MENU_HEIGHT,
    ),
    width: menuWidth ?? minMenuWidth,
  };
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
  menuWidth,
  minMenuWidth = DEFAULT_MIN_MENU_WIDTH,
  onDismiss,
  placement = 'anchor',
  visible,
}: DismissibleDropdownMenuProps) {
  const insets = useSafeAreaInsets();

  if (!visible || (placement === 'anchor' && anchor === null)) {
    return null;
  }

  const anchorFrame =
    placement === 'anchor' && anchor !== null
      ? {
          ...getDropdownMenuPlacement(anchor, insets),
          ...resolveDropdownMenuFrame(anchor, minMenuWidth, menuWidth),
        }
      : null;
  const centerFrame =
    placement === 'center'
      ? resolveCenteredMenuFrame(insets, minMenuWidth, menuWidth)
      : null;

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <View
        style={[
          styles.overlay,
          placement === 'center' && styles.centeredOverlay,
        ]}
      >
        {blurBackdrop ? (
          <BlurScrim onDismiss={onDismiss} />
        ) : (
          <Pressable
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
          />
        )}
        {anchorFrame && anchor ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.menu,
              {
                left: anchorFrame.left,
                maxHeight: anchorFrame.maxHeight,
                width: anchorFrame.width,
                zIndex: 1,
              },
              anchorFrame.openBelow
                ? { top: anchor.y + anchor.height + MENU_GAP }
                : { bottom: SCREEN_HEIGHT - anchor.y + MENU_GAP },
            ]}
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={{ maxHeight: anchorFrame.maxHeight }}
            >
              {children}
            </ScrollView>
          </View>
        ) : null}
        {centerFrame ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.centerMenu,
              {
                maxHeight: centerFrame.maxHeight,
                width: centerFrame.width,
                zIndex: 1,
              },
            ]}
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={{ maxHeight: centerFrame.maxHeight }}
            >
              {children}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  centeredOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  centerMenu: {
    position: 'relative',
  },
  menu: {
    position: 'absolute',
  },
});
