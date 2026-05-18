export function generateCaptureAssetId(now = Date.now()): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `in_app_${now.toString(36)}_${randomPart}`;
}

export function createCaptureEventId(localAssetId: string): string {
  return `capture_event_${localAssetId}`;
}
