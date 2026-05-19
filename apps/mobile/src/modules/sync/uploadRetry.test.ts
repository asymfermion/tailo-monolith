import {
  canRetryUpload,
  getNextUploadAttemptAt,
  isUploadQueueItemReady,
} from './uploadRetry';

describe('uploadRetry', () => {
  it('schedules backoff attempts', () => {
    const first = getNextUploadAttemptAt(
      0,
      Date.parse('2026-05-18T00:00:00.000Z'),
    );
    expect(first).toBe('2026-05-18T00:01:00.000Z');
  });

  it('allows pending items immediately', () => {
    expect(isUploadQueueItemReady('pending', 0, null)).toBe(true);
  });

  it('waits until next_attempt_at for failed retries', () => {
    expect(
      isUploadQueueItemReady(
        'failed',
        1,
        '2026-05-18T01:00:00.000Z',
        Date.parse('2026-05-18T00:30:00.000Z'),
      ),
    ).toBe(false);
  });

  it('stops retrying after max attempts', () => {
    expect(canRetryUpload(3)).toBe(false);
  });
});
