import type { TimelineEventMedia } from '@/types';

export function shouldContainMomentImage({
  width,
  height,
}: Pick<TimelineEventMedia, 'width' | 'height'>): boolean {
  return width > 0 && height > width;
}

export function getMomentImageHeightForWidth(
  { width, height }: Pick<TimelineEventMedia, 'width' | 'height'>,
  displayWidth: number,
): number {
  if (displayWidth <= 0) {
    return 0;
  }

  if (width <= 0 || height <= 0) {
    return Math.round(displayWidth * 0.75);
  }

  return Math.round((displayWidth * height) / width);
}
