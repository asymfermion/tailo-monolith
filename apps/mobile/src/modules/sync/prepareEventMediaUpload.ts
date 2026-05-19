import { UPLOAD_MAX_THUMB_WIDTH_PX } from '@tailo/shared';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import {
  assertOriginalWithinUploadLimit,
  buildOriginalResizeAction,
  buildThumbnailResizeAction,
  getOriginalManipulatorOptions,
  getThumbnailManipulatorOptions,
  isThumbnailWithinTarget,
  toPreparedUploadImage,
  type PreparedUploadImage,
} from './compressEventMedia';

export type PrepareEventMediaUploadInput = {
  uri: string;
  width: number;
  height: number;
};

export type PreparedEventMediaUpload = {
  original: PreparedUploadImage;
  thumbnail: PreparedUploadImage;
};

async function getFileByteSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists || typeof info.size !== 'number') {
    throw new Error('Could not read compressed image size.');
  }

  return info.size;
}

async function manipulateToJpeg(
  uri: string,
  width: number,
  height: number,
  actions: ReturnType<typeof buildOriginalResizeAction>,
  options: ReturnType<typeof getOriginalManipulatorOptions>,
): Promise<PreparedUploadImage> {
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: options.compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const byteSize = await getFileByteSize(result.uri);

  return toPreparedUploadImage(
    result.uri,
    result.width ?? width,
    result.height ?? height,
    byteSize,
  );
}

export async function prepareEventMediaUpload(
  input: PrepareEventMediaUploadInput,
): Promise<PreparedEventMediaUpload> {
  const original = await manipulateToJpeg(
    input.uri,
    input.width,
    input.height,
    buildOriginalResizeAction(input.width, input.height),
    getOriginalManipulatorOptions(),
  );

  assertOriginalWithinUploadLimit(original.byteSize);

  let thumbnail = await manipulateToJpeg(
    original.uri,
    original.width,
    original.height,
    buildThumbnailResizeAction(original.width, original.height),
    getThumbnailManipulatorOptions(),
  );

  if (!isThumbnailWithinTarget(thumbnail.byteSize)) {
    thumbnail = await manipulateToJpeg(
      thumbnail.uri,
      thumbnail.width,
      thumbnail.height,
      [
        {
          resize: {
            width: Math.max(240, Math.floor(UPLOAD_MAX_THUMB_WIDTH_PX * 0.75)),
          },
        },
      ],
      {
        compress: Math.max(
          0.6,
          getThumbnailManipulatorOptions().compress - 0.1,
        ),
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
  }

  return { original, thumbnail };
}
