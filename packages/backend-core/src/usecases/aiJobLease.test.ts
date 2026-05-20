import { describe, expect, it } from 'vitest';

import {
  parseProcessAiJobInvokeRequest,
  shouldReleaseAiJobLease,
} from './aiJobLease';

describe('shouldReleaseAiJobLease', () => {
  const now = '2026-05-20T12:00:00.000Z';

  it('releases processing jobs with expired lease', () => {
    expect(
      shouldReleaseAiJobLease({
        status: 'processing',
        leasedUntil: '2026-05-20T11:00:00.000Z',
        nowIso: now,
      }),
    ).toBe(true);
  });

  it('releases processing jobs with null lease', () => {
    expect(
      shouldReleaseAiJobLease({
        status: 'processing',
        leasedUntil: null,
        nowIso: now,
      }),
    ).toBe(true);
  });

  it('keeps active processing jobs', () => {
    expect(
      shouldReleaseAiJobLease({
        status: 'processing',
        leasedUntil: '2026-05-20T13:00:00.000Z',
        nowIso: now,
      }),
    ).toBe(false);
  });

  it('ignores pending jobs', () => {
    expect(
      shouldReleaseAiJobLease({
        status: 'pending',
        leasedUntil: null,
        nowIso: now,
      }),
    ).toBe(false);
  });
});

describe('parseProcessAiJobInvokeRequest', () => {
  it('defaults to single job', () => {
    expect(parseProcessAiJobInvokeRequest(null)).toEqual({
      sweep: false,
      maxJobs: 1,
    });
  });

  it('parses sweep with capped max_jobs', () => {
    expect(
      parseProcessAiJobInvokeRequest({ sweep: true, max_jobs: 99 }),
    ).toEqual({
      sweep: true,
      maxJobs: 10,
    });
  });
});
