import {
  UPLOAD_MAX_ORIGINAL_BYTES,
  UPLOAD_MAX_ORIGINAL_WIDTH_PX,
  UPLOAD_MAX_THUMB_WIDTH_PX,
  UPLOAD_ORIGINAL_JPEG_QUALITY,
  UPLOAD_TARGET_THUMB_BYTES,
  UPLOAD_THUMB_JPEG_QUALITY,
} from '@tailo/shared';

export type CompressResizeAction = {
  resize: {
    width: number;
  };
};

export type PreparedUploadImage = {
  uri: string;
  width: number;
  height: number;
  byteSize: number;
};

export function buildOriginalResizeAction(
  width: number,
  height: number,
): CompressResizeAction[] {
  if (width <= UPLOAD_MAX_ORIGINAL_WIDTH_PX) {
    return [];
  }

  return [{ resize: { width: UPLOAD_MAX_ORIGINAL_WIDTH_PX } }];
}

export function buildThumbnailResizeAction(
  width: number,
  height: number,
): CompressResizeAction[] {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= UPLOAD_MAX_THUMB_WIDTH_PX) {
    return [];
  }

  return [{ resize: { width: UPLOAD_MAX_THUMB_WIDTH_PX } }];
}

export function getOriginalManipulatorOptions() {
  return {
    compress: UPLOAD_ORIGINAL_JPEG_QUALITY,
    format: 'jpeg' as const,
  };
}

export function getThumbnailManipulatorOptions() {
  return {
    compress: UPLOAD_THUMB_JPEG_QUALITY,
    format: 'jpeg' as const,
  };
}

export function assertOriginalWithinUploadLimit(byteSize: number): void {
  if (byteSize > UPLOAD_MAX_ORIGINAL_BYTES) {
    throw new Error('Compressed photo is still too large to upload.');
  }
}

export function isThumbnailWithinTarget(byteSize: number): boolean {
  return byteSize <= UPLOAD_TARGET_THUMB_BYTES;
}

export function toPreparedUploadImage(
  uri: string,
  width: number,
  height: number,
  byteSize: number,
): PreparedUploadImage {
  return { uri, width, height, byteSize };
}
