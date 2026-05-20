import { spacing } from '@/constants/theme';

/**
 * Top inset for modal toolbars. AppShell skips `paddingTop` while a modal is open,
 * so this must clear the status bar / Dynamic Island (use the full safe-area value).
 */
export function getModalHeaderTopInset(safeAreaTop: number): number {
  if (safeAreaTop <= 0) {
    return spacing.xs;
  }

  return safeAreaTop;
}

/** Fixed toolbar row height (back + action icons) on compact modal headers. */
export const MODAL_TOOLBAR_HEIGHT = 40;

/** Top padding for tab screens (safe area + small gap before title). */
export function getTabScreenTopPadding(safeAreaTop: number): number {
  return getModalHeaderTopInset(safeAreaTop) + spacing.sm;
}

/** Total height of the fixed modal header (safe area + toolbar + bottom pad). */
export function getModalHeaderHeight(safeAreaTop: number): number {
  return getModalHeaderTopInset(safeAreaTop) + MODAL_TOOLBAR_HEIGHT + spacing.xs;
}

/** Top of the edge-swipe zone — keep the modal toolbar tappable. */
export function getModalSwipeHeaderExclusion(safeAreaTop: number): number {
  return getModalHeaderHeight(safeAreaTop);
}
