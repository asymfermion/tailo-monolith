import {
  getModalHeaderHeight,
  getModalHeaderTopInset,
  getModalSwipeHeaderExclusion,
  getTabScreenTopPadding,
} from './modalHeaderInset';

describe('getModalHeaderTopInset', () => {
  it('returns minimal inset when there is no safe area', () => {
    expect(getModalHeaderTopInset(0)).toBe(4);
  });

  it('uses the full safe-area top so modals clear the status bar and Dynamic Island', () => {
    expect(getModalHeaderTopInset(59)).toBe(59);
    expect(getModalHeaderTopInset(47)).toBe(47);
  });
});

describe('getTabScreenTopPadding', () => {
  it('adds a small gap below the safe area', () => {
    expect(getTabScreenTopPadding(59)).toBe(67);
  });
});

describe('getModalHeaderHeight', () => {
  it('includes safe area, toolbar, and bottom padding', () => {
    expect(getModalHeaderHeight(59)).toBe(103);
    expect(getModalHeaderHeight(0)).toBe(48);
  });
});

describe('getModalSwipeHeaderExclusion', () => {
  it('matches the full header height', () => {
    expect(getModalSwipeHeaderExclusion(59)).toBe(103);
  });
});
