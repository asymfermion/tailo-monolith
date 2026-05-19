import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';

export async function uploadToSignedUrl(
  signedUrl: string,
  localUri: string,
): Promise<void> {
  const result = await uploadAsync(signedUrl, localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status}).`);
  }
}
