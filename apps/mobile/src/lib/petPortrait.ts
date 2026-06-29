import {
  documentDirectory,
  deleteAsync,
  downloadAsync,
  moveAsync,
} from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const PORTRAIT_FILENAME = 'pet_portrait.jpg';
const PORTRAIT_SIZE = 300;

export const PORTRAIT_FILE_PATH =
  documentDirectory != null
    ? `${documentDirectory}${PORTRAIT_FILENAME}`
    : PORTRAIT_FILENAME;

export async function cropAndSavePortrait(sourceUri: string): Promise<string> {
  // manipulateAsync handles ph:// URIs natively; Image.getSize cannot
  const { width, height } = await ImageManipulator.manipulateAsync(
    sourceUri,
    [],
  );
  const side = Math.min(width, height);
  const originX = Math.floor((width - side) / 2);
  const originY = Math.floor((height - side) / 2);

  const result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [
      { crop: { originX, originY, width: side, height: side } },
      { resize: { width: PORTRAIT_SIZE, height: PORTRAIT_SIZE } },
    ],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.85 },
  );

  await deleteAsync(PORTRAIT_FILE_PATH, { idempotent: true });
  await moveAsync({ from: result.uri, to: PORTRAIT_FILE_PATH });
  return PORTRAIT_FILE_PATH;
}

export async function downloadAndSavePortrait(url: string): Promise<string> {
  await deleteAsync(PORTRAIT_FILE_PATH, { idempotent: true });
  const result = await downloadAsync(url, PORTRAIT_FILE_PATH);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Portrait download failed (${result.status}).`);
  }
  return PORTRAIT_FILE_PATH;
}
