import { getMainTabFromIndex, getMainTabIndex } from './mainTabPager';

describe('mainTabPager', () => {
  it('maps tabs to pager indices left to right', () => {
    expect(getMainTabIndex('Timeline')).toBe(0);
    expect(getMainTabIndex('PetProfile')).toBe(1);
    expect(getMainTabIndex('Settings')).toBe(2);
  });

  it('maps pager indices back to tabs', () => {
    expect(getMainTabFromIndex(0)).toBe('Timeline');
    expect(getMainTabFromIndex(1)).toBe('PetProfile');
    expect(getMainTabFromIndex(2)).toBe('Settings');
  });
});
