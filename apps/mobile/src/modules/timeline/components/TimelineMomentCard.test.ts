import {
  getMomentImageHeightForWidth,
  shouldContainMomentImage,
} from './momentImageFit';

describe('shouldContainMomentImage', () => {
  it('contains portrait photos and covers landscape or unknown sizes', () => {
    expect(shouldContainMomentImage({ width: 1200, height: 1600 })).toBe(true);
    expect(shouldContainMomentImage({ width: 1600, height: 1200 })).toBe(false);
    expect(shouldContainMomentImage({ width: 0, height: 1600 })).toBe(false);
  });
});

describe('getMomentImageHeightForWidth', () => {
  it('uses the image natural ratio at full display width', () => {
    expect(
      getMomentImageHeightForWidth({ width: 3000, height: 4000 }, 393),
    ).toBe(524);
    expect(
      getMomentImageHeightForWidth({ width: 4000, height: 3000 }, 393),
    ).toBe(295);
  });

  it('falls back to a 4:3 landscape height when dimensions are missing', () => {
    expect(getMomentImageHeightForWidth({ width: 0, height: 0 }, 393)).toBe(
      295,
    );
  });
});
