import {
  copyAsync,
  documentDirectory,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

import { generateCaptureAssetId } from './captureIds';

export type PersistedCaptureImage = {
  localAssetId: string;
  uri: string;
};

export async function persistCaptureImage(
  tempUri: string,
  options?: {
    generateId?: () => string;
    documentRoot?: string | null;
    copyFile?: typeof copyAsync;
    makeDirectory?: typeof makeDirectoryAsync;
  },
): Promise<PersistedCaptureImage> {
  const documentRoot = options?.documentRoot ?? documentDirectory;

  if (!documentRoot) {
    throw new Error('Local storage is unavailable on this device.');
  }

  const localAssetId = options?.generateId?.() ?? generateCaptureAssetId();
  const capturesDirectory = `${documentRoot}captures`;
  const destinationUri = `${capturesDirectory}/${localAssetId}.jpg`;
  const copyFile = options?.copyFile ?? copyAsync;
  const makeDirectory = options?.makeDirectory ?? makeDirectoryAsync;

  await makeDirectory(capturesDirectory, { intermediates: true });
  await copyFile({ from: tempUri, to: destinationUri });

  return {
    localAssetId,
    uri: destinationUri,
  };
}
