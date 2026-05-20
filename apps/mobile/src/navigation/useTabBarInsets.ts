import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';

import {
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
  getTabBarContentInset,
} from './tabBarLayout';

/** Distance from screen bottom to tab bar pill (above home indicator). */
export function useTabBarBottomOffset(): number {
  const { bottom } = useSafeAreaInsets();
  return TAB_BAR_BOTTOM_MARGIN + bottom;
}

/** Scroll / FAB inset so content clears the floating tab bar. */
export function useTabBarContentInset(): number {
  const { bottom } = useSafeAreaInsets();
  return getTabBarContentInset(bottom);
}
