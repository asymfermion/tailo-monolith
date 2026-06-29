import type { TimelineEventMedia } from '@/types';

import {
  getShareMomentExportLayout,
  getShareMomentExportMedia,
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
    expect(getShareMomentExportLayout(1)).toHaveLength(1);
    expect(getShareMomentExportLayout(2)).toHaveLength(2);
    expect(getShareMomentExportLayout(3)).toHaveLength(3);
  });

  it('does not allocate a fourth export tile', () => {
    expect(getShareMomentExportLayout(4)).toHaveLength(3);
  });
});
