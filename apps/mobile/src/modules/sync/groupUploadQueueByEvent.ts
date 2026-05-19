import type { UploadQueueRow } from '@/db/uploadQueue';
import { UPLOAD_MAX_ASSETS_PER_EVENT } from '@tailo/shared';

import { isUploadQueueItemReady } from './uploadRetry';

export type UploadQueueEventBatch = {
  localEventId: string;
  items: UploadQueueRow[];
};

export function groupUploadQueueByEvent(
  rows: UploadQueueRow[],
): UploadQueueEventBatch[] {
  const readyRows = rows.filter((row) =>
    isUploadQueueItemReady(row.status, row.retryCount, row.nextAttemptAt),
  );
  const grouped = new Map<string, UploadQueueRow[]>();

  for (const row of readyRows) {
    const existing = grouped.get(row.localEventId) ?? [];
    existing.push(row);
    grouped.set(row.localEventId, existing);
  }

  return [...grouped.entries()].map(([localEventId, items]) => ({
    localEventId,
    items: items.slice(0, UPLOAD_MAX_ASSETS_PER_EVENT),
  }));
}
