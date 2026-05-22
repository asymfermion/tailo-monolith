import { isSameAssetIdSet, moveAssetIdInOrder } from './reorderMomentMedia';

describe('reorderMomentMedia helpers', () => {
  it('validates asset id sets', () => {
    expect(isSameAssetIdSet(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(isSameAssetIdSet(['a', 'b'], ['a'])).toBe(false);
    expect(isSameAssetIdSet(['a'], ['b'])).toBe(false);
  });

  it('moves an asset up', () => {
    expect(moveAssetIdInOrder(['a', 'b', 'c'], 1, 'up')).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('moves an asset down', () => {
    expect(moveAssetIdInOrder(['a', 'b', 'c'], 0, 'down')).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('returns null when move is out of range', () => {
    expect(moveAssetIdInOrder(['a', 'b'], 0, 'up')).toBeNull();
    expect(moveAssetIdInOrder(['a', 'b'], 1, 'down')).toBeNull();
  });
});
