import { spacing } from '@/constants/theme';

import {
  TAB_BAR_BOTTOM_MARGIN,
  TAB_BAR_HEIGHT,
  TAB_BAR_HORIZONTAL_MARGIN,
  getTabBarContentInset,
} from './tabBarLayout';

describe('tabBarLayout', () => {
  it('reserves enough bottom inset for floating bar height and home indicator', () => {
    const inset = getTabBarContentInset(34);
    expect(inset).toBeGreaterThan(TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + 34);
    expect(TAB_BAR_HORIZONTAL_MARGIN).toBeGreaterThan(0);
  });

  it('adds scroll breathing room below the bar', () => {
    expect(getTabBarContentInset(0)).toBe(
      TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + spacing.lg,
    );
  });
});
