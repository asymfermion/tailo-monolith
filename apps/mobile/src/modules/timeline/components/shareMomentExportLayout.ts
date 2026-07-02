import type { TimelineEventMedia } from '@/types';

export const EXPORT_REFERENCE_WIDTH = 360;
export const EXPORT_PREVIEW_WIDTH = 360;
export const EXPORT_PREVIEW_HEIGHT = 640.156;
export const EXPORT_SCALE = EXPORT_PREVIEW_WIDTH / EXPORT_REFERENCE_WIDTH;
export const MAX_EXPORT_PHOTOS = 3;
export const EXPORT_BACKGROUND = '#FBF7F1';
export const EXPORT_SURFACE = '#FFFDF9';
export const EXPORT_BORDER = '#E7DDD2';
export const EXPORT_TEXT = '#151412';
export const EXPORT_MUTED_TEXT = '#6F665D';
export const EXPORT_TITLE_FONT_SIZE = 17;
export const EXPORT_TITLE_LINE_HEIGHT = 22;
export const EXPORT_CAPTION_FONT_SIZE = 9.5;
export const EXPORT_CAPTION_LINE_HEIGHT = 14;
export const EXPORT_METADATA_FONT_SIZE = 8;
export const EXPORT_METADATA_LINE_HEIGHT = 12;
export const EXPORT_WATERMARK_WIDTH = 40;
export const EXPORT_WATERMARK_HEIGHT = 17.1;

export const scaleExport = (value: number) => value * EXPORT_SCALE;

export type ShareMomentExportFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
  borderColor?: string;
  borderWidth?: number;
  contentFit?: 'cover' | 'contain';
  elevation?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
};

export type ShareMomentExportTextLayout = {
  textLeft: number;
  titleTop: number;
  titleWidth: number;
  titleFontSize: number;
  titleLineHeight: number;
  captionTop: number;
  captionWidth: number;
  captionFontSize: number;
  captionLineHeight: number;
  metadataTop: number;
  metadataWidth: number;
  watermarkLeft: number;
  watermarkTop: number;
};

export type ShareMomentExportLayout = {
  photos: readonly ShareMomentExportFrame[];
  text: ShareMomentExportTextLayout;
};

const EXPORT_PHOTO_LAYOUTS = {
  1: {
    photos: [
      {
        left: scaleExport(11.2),
        top: scaleExport(11.2),
        width: scaleExport(332),
        height: scaleExport(506),
        borderRadius: scaleExport(14),
      },
    ],
    text: {
      textLeft: scaleExport(11.2),
      titleTop: scaleExport(527.6),
      titleWidth: scaleExport(332),
      titleFontSize: EXPORT_TITLE_FONT_SIZE,
      titleLineHeight: EXPORT_TITLE_LINE_HEIGHT,
      captionTop: scaleExport(555.6),
      captionWidth: scaleExport(332),
      captionFontSize: EXPORT_CAPTION_FONT_SIZE,
      captionLineHeight: EXPORT_CAPTION_LINE_HEIGHT,
      metadataTop: scaleExport(605.6),
      metadataWidth: scaleExport(180),
      watermarkLeft: scaleExport(303.2),
      watermarkTop: scaleExport(602.1),
    },
  },
  2: {
    photos: [
      {
        left: scaleExport(11.2),
        top: scaleExport(11.2),
        width: scaleExport(332),
        height: scaleExport(506),
        borderRadius: scaleExport(14),
      },
      {
        left: scaleExport(207.2),
        top: scaleExport(377.2),
        width: scaleExport(124),
        height: scaleExport(124),
        borderColor: EXPORT_SURFACE,
        borderRadius: scaleExport(18),
        borderWidth: scaleExport(4),
        contentFit: 'cover',
        elevation: 3,
        shadowColor: EXPORT_TEXT,
        shadowOffset: { width: 0, height: scaleExport(6) },
        shadowOpacity: 0.18,
        shadowRadius: scaleExport(18),
      },
    ],
    text: {
      textLeft: scaleExport(11.2),
      titleTop: scaleExport(527.6),
      titleWidth: scaleExport(332),
      titleFontSize: EXPORT_TITLE_FONT_SIZE,
      titleLineHeight: EXPORT_TITLE_LINE_HEIGHT,
      captionTop: scaleExport(555.6),
      captionWidth: scaleExport(332),
      captionFontSize: EXPORT_CAPTION_FONT_SIZE,
      captionLineHeight: EXPORT_CAPTION_LINE_HEIGHT,
      metadataTop: scaleExport(605.6),
      metadataWidth: scaleExport(180),
      watermarkLeft: scaleExport(303.2),
      watermarkTop: scaleExport(602.1),
    },
  },
  3: {
    photos: [
      {
        left: scaleExport(11.2),
        top: scaleExport(11.2),
        width: scaleExport(332),
        height: scaleExport(330),
        borderRadius: scaleExport(14),
      },
      {
        left: scaleExport(11.2),
        top: scaleExport(347.2),
        width: scaleExport(108),
        height: scaleExport(170),
        borderRadius: scaleExport(11),
        contentFit: 'cover',
      },
      {
        left: scaleExport(125.2),
        top: scaleExport(347.2),
        width: scaleExport(218),
        height: scaleExport(170),
        borderRadius: scaleExport(11),
        contentFit: 'cover',
      },
    ],
    text: {
      textLeft: scaleExport(11.2),
      titleTop: scaleExport(527.6),
      titleWidth: scaleExport(332),
      titleFontSize: EXPORT_TITLE_FONT_SIZE,
      titleLineHeight: EXPORT_TITLE_LINE_HEIGHT,
      captionTop: scaleExport(555.6),
      captionWidth: scaleExport(332),
      captionFontSize: EXPORT_CAPTION_FONT_SIZE,
      captionLineHeight: EXPORT_CAPTION_LINE_HEIGHT,
      metadataTop: scaleExport(605.6),
      metadataWidth: scaleExport(180),
      watermarkLeft: scaleExport(303.2),
      watermarkTop: scaleExport(602.1),
    },
  },
} as const satisfies Record<1 | 2 | 3, ShareMomentExportLayout>;

export const EXPORT_SPECKLES = [
  { left: 21.01, top: 23.81 },
  { left: 64.44, top: 89.65 },
  { left: 107.86, top: 155.49 },
  { left: 151.28, top: 221.32 },
  { left: 194.71, top: 287.16 },
  { left: 238.13, top: 353 },
  { left: 281.56, top: 418.83 },
  { left: 324.98, top: 484.67 },
  { left: 53.23, top: 550.51 },
  { left: 96.65, top: 28.02 },
  { left: 140.08, top: 93.85 },
  { left: 183.5, top: 159.69 },
] as const;

export function getShareMomentExportMedia(
  media: TimelineEventMedia[],
): TimelineEventMedia[] {
  return media.slice(0, MAX_EXPORT_PHOTOS);
}

export function getShareMomentExportLayout(
  photoCount: number,
): ShareMomentExportLayout {
  const layoutPhotoCount = Math.min(
    Math.max(Math.floor(photoCount), 0),
    MAX_EXPORT_PHOTOS,
  );

  if (layoutPhotoCount === 0) {
    return { ...EXPORT_PHOTO_LAYOUTS[1], photos: [] };
  }

  return EXPORT_PHOTO_LAYOUTS[layoutPhotoCount as 1 | 2 | 3];
}
