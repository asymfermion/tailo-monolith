import {
  buildOriginalResizeAction,
  buildThumbnailResizeAction,
} from './compressEventMedia';

describe('compressEventMedia', () => {
  it('skips original resize when already within max width', () => {
    expect(buildOriginalResizeAction(1000, 800)).toEqual([]);
  });

  it('resizes originals wider than 1280px', () => {
    expect(buildOriginalResizeAction(2000, 1500)).toEqual([
      { resize: { width: 1280 } },
    ]);
  });

  it('resizes thumbnails wider than 400px', () => {
    expect(buildThumbnailResizeAction(1200, 900)).toEqual([
      { resize: { width: 400 } },
    ]);
  });
});
