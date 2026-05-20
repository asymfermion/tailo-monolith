import { spacing } from '@/constants/theme';

/** Floating tab bar dimensions — keep in sync with MainTabBar styles. */
export const TAB_BAR_HEIGHT = 56;
export const TAB_BAR_BOTTOM_MARGIN = spacing.md;
export const TAB_BAR_HORIZONTAL_MARGIN = spacing.md;

/** Bottom padding for scrollable content and FAB — pass device safe-area bottom. */
export function getTabBarContentInset(safeAreaBottom: number): number {
  return TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + safeAreaBottom + spacing.lg;
}
