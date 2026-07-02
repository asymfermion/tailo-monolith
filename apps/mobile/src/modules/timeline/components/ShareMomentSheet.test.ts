import type { TimelineEventMedia } from '@/types';

import {
  EXPORT_CAPTION_FONT_SIZE,
  EXPORT_CAPTION_LINE_HEIGHT,
  EXPORT_TITLE_FONT_SIZE,
  EXPORT_TITLE_LINE_HEIGHT,
  getShareMomentExportLayout,
  getShareMomentExportMedia,
  scaleExport,
} from './shareMomentExportLayout';

function media(id: string): TimelineEventMedia {
  return {
    localAssetId: id,
    uri: `file://${id}.jpg`,
    width: 1600,
    height: 1200,
    isPrimary: id === 'cover',
    detectedPetType: null,
    petConfidence: null,
    overallScore: 0,
    isPetCandidate: true,
    detectionDebugLabel: null,
    detectedBreed: null,
  };
}

describe('getShareMomentExportMedia', () => {
  it('uses only the first three photos in deterministic order', () => {
    const selected = ['cover', 'second', 'third', 'fourth'].map(media);

    expect(
      getShareMomentExportMedia(selected).map((item) => item.localAssetId),
    ).toEqual(['cover', 'second', 'third']);
  });
});

describe('getShareMomentExportLayout', () => {
  it('chooses separate generated-image layouts for one, two, and three photos', () => {
    expect(getShareMomentExportLayout(1).photos).toHaveLength(1);
    expect(getShareMomentExportLayout(2).photos).toHaveLength(2);
    expect(getShareMomentExportLayout(3).photos).toHaveLength(3);
  });

  it('does not allocate a fourth export tile', () => {
    expect(getShareMomentExportLayout(4).photos).toHaveLength(3);
  });

  it('uses the same export font sizes for every template', () => {
    for (const photoCount of [1, 2, 3]) {
      expect(getShareMomentExportLayout(photoCount).text).toMatchObject({
        captionFontSize: EXPORT_CAPTION_FONT_SIZE,
        captionLineHeight: EXPORT_CAPTION_LINE_HEIGHT,
        titleFontSize: EXPORT_TITLE_FONT_SIZE,
        titleLineHeight: EXPORT_TITLE_LINE_HEIGHT,
      });
    }
  });

  it('matches the updated three-image preview proportions', () => {
    const layout = getShareMomentExportLayout(3);

    expect(layout.photos[0]).toMatchObject({
      left: scaleExport(11.2),
      top: scaleExport(11.2),
      width: scaleExport(332),
      height: scaleExport(330),
    });
    expect(layout.photos[1]).toMatchObject({
      contentFit: 'cover',
      left: scaleExport(11.2),
      top: scaleExport(347.2),
      width: scaleExport(108),
      height: scaleExport(170),
    });
    expect(layout.photos[2]).toMatchObject({
      contentFit: 'cover',
      left: scaleExport(125.2),
      top: scaleExport(347.2),
      width: scaleExport(218),
      height: scaleExport(170),
    });
    expect(layout.text.titleTop).toBe(scaleExport(527.6));
  });

  it('uses the updated cover plus detail inset layout for two images', () => {
    const layout = getShareMomentExportLayout(2);

    expect(layout.photos[0]).toMatchObject({
      left: scaleExport(11.2),
      top: scaleExport(11.2),
      width: scaleExport(332),
      height: scaleExport(506),
    });
    expect(layout.photos[1]).toMatchObject({
      borderWidth: scaleExport(4),
      contentFit: 'cover',
      left: scaleExport(207.2),
      top: scaleExport(377.2),
      height: scaleExport(124),
      width: scaleExport(124),
    });
  });
});
