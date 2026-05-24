/** True when the URI points at on-device photo library media (not a remote signed URL). */
export function isDeviceMediaUri(uri: string): boolean {
  return (
    uri.startsWith('ph://') ||
    uri.startsWith('file://') ||
    uri.startsWith('assets-library://')
  );
}

/** True when the URI is a remote HTTP(S) URL (e.g. signed cloud thumbnail). */
export function isRemoteMediaUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}
