import type { TimelineEventMedia } from '@/types';

export const EXPORT_REFERENCE_WIDTH = 303;
export const EXPORT_PREVIEW_WIDTH = 303;
export const EXPORT_PREVIEW_HEIGHT = 539;
export const EXPORT_SCALE = EXPORT_PREVIEW_WIDTH / EXPORT_REFERENCE_WIDTH;
export const MAX_EXPORT_PHOTOS = 3;
export const EXPORT_BACKGROUND = '#FBF7F1';
export const EXPORT_SURFACE = '#FFFDF9';
export const EXPORT_BORDER = '#E7DDD2';
export const EXPORT_TEXT = '#151412';
export const EXPORT_MUTED_TEXT = '#6F665D';

export const scaleExport = (value: number) => Math.round(value * EXPORT_SCALE);

export type ShareMomentExportFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
};

const EXPORT_PHOTO_LAYOUTS = {
  1: [
    {
      left: scaleExport(11),
      top: scaleExport(11),
      width: scaleExport(279),
      height: scaleExport(381),
      borderRadius: scaleExport(12),
    },
  ],
  2: [
    {
      left: scaleExport(11),
      top: scaleExport(11),
      width: scaleExport(279),
      height: scaleExport(244),
      borderRadius: scaleExport(12),
    },
    {
      left: scaleExport(11),
      top: scaleExport(260),
      width: scaleExport(279),
      height: scaleExport(132),
      borderRadius: scaleExport(10),
    },
  ],
  3: [
    {
      left: scaleExport(11),
      top: scaleExport(11),
      width: scaleExport(279),
      height: scaleExport(244),
      borderRadius: scaleExport(12),
    },
    {
      left: scaleExport(11),
      top: scaleExport(260),
      width: scaleExport(137),
      height: scaleExport(132),
      borderRadius: scaleExport(10),
    },
    {
      left: scaleExport(153),
      top: scaleExport(260),
      width: scaleExport(137),
      height: scaleExport(132),
      borderRadius: scaleExport(10),
    },
  ],
} as const satisfies Record<1 | 2 | 3, readonly ShareMomentExportFrame[]>;

export const EXPORT_SPECKLES = [
  { left: 18, top: 20 },
  { left: 54, top: 76 },
  { left: 91, top: 131 },
  { left: 127, top: 186 },
  { left: 164, top: 242 },
  { left: 201, top: 297 },
  { left: 237, top: 353 },
  { left: 274, top: 408 },
  { left: 45, top: 464 },
  { left: 81, top: 24 },
  { left: 118, top: 79 },
  { left: 155, top: 135 },
] as const;

export function getShareMomentExportMedia(
  media: TimelineEventMedia[],
): TimelineEventMedia[] {
  return media.slice(0, MAX_EXPORT_PHOTOS);
}

export function getShareMomentExportLayout(
  photoCount: number,
): readonly ShareMomentExportFrame[] {
  const layoutPhotoCount = Math.min(
    Math.max(Math.floor(photoCount), 0),
    MAX_EXPORT_PHOTOS,
  );

  if (layoutPhotoCount === 0) {
    return [];
  }

  return EXPORT_PHOTO_LAYOUTS[layoutPhotoCount as 1 | 2 | 3];
}
