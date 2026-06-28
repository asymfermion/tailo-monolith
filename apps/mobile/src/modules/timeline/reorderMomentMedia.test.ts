import {
  isSameAssetIdSet,
  moveAssetIdInOrder,
  moveAssetToIndex,
} from './reorderMomentMedia';

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

  it('moves an asset to an arbitrary index (drag drop)', () => {
    expect(moveAssetToIndex(['a', 'b', 'c', 'd'], 0, 2)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
    expect(moveAssetToIndex(['a', 'b', 'c', 'd'], 3, 1)).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('clamps drag target into range and ignores no-op moves', () => {
    expect(moveAssetToIndex(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
    expect(moveAssetToIndex(['a', 'b', 'c'], 1, 1)).toBeNull();
    expect(moveAssetToIndex(['a', 'b'], 5, 0)).toBeNull();
  });
});
