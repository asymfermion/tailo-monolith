import type { UploadQueueRow } from '@/db/uploadQueue';

import { groupUploadQueueByEvent } from './groupUploadQueueByEvent';

function createRow(
  overrides: Partial<UploadQueueRow> &
    Pick<UploadQueueRow, 'localEventId' | 'localAssetId'>,
): UploadQueueRow {
  return {
    id: `upload_${overrides.localEventId}_${overrides.localAssetId}`,
    status: 'pending',
    retryCount: 0,
    lastError: null,
    storagePath: null,
    thumbnailPath: null,
    mediaFingerprint: null,
    nextAttemptAt: null,
    ...overrides,
  };
}

describe('groupUploadQueueByEvent', () => {
  it('groups ready rows by event and caps batch size', () => {
    const rows = Array.from({ length: 6 }, (_, index) =>
      createRow({
        localEventId: 'event-1',
        localAssetId: `asset-${index}`,
      }),
    );

    expect(groupUploadQueueByEvent(rows)).toEqual([
      {
        localEventId: 'event-1',
        items: rows.slice(0, 5),
      },
    ]);
  });

  it('skips failed rows that are not ready to retry', () => {
    const rows = [
      createRow({
        localEventId: 'event-1',
        localAssetId: 'asset-1',
        status: 'failed',
        retryCount: 1,
        nextAttemptAt: '2099-01-01T00:00:00.000Z',
      }),
    ];

    expect(groupUploadQueueByEvent(rows)).toEqual([]);
  });
});
