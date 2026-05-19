import { UPLOAD_MAX_RETRIES, UPLOAD_RETRY_BACKOFF_MS } from '@tailo/shared';

export function getUploadRetryBackoffMs(retryCount: number): number {
  const index = Math.min(retryCount, UPLOAD_RETRY_BACKOFF_MS.length - 1);
  return (
    UPLOAD_RETRY_BACKOFF_MS[index] ?? UPLOAD_RETRY_BACKOFF_MS.at(-1) ?? 60_000
  );
}

export function getNextUploadAttemptAt(
  retryCount: number,
  from = Date.now(),
): string {
  return new Date(from + getUploadRetryBackoffMs(retryCount)).toISOString();
}

export function canRetryUpload(retryCount: number): boolean {
  return retryCount < UPLOAD_MAX_RETRIES;
}

export function isUploadQueueItemReady(
  status: 'pending' | 'uploading' | 'done' | 'failed',
  retryCount: number,
  nextAttemptAt: string | null,
  now = Date.now(),
): boolean {
  if (status === 'pending') {
    return true;
  }

  if (status !== 'failed' || !canRetryUpload(retryCount)) {
    return false;
  }

  if (!nextAttemptAt) {
    return true;
  }

  return Date.parse(nextAttemptAt) <= now;
}
