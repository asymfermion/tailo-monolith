import { describe, expect, it } from 'vitest';

import {
  AI_JOB_MAX_ATTEMPTS,
  getAiJobBackoffIso,
  isAiJobDue,
  resolveAiJobFailure,
} from './aiJobFailure';

describe('resolveAiJobFailure', () => {
  const now = Date.parse('2026-05-20T12:00:00.000Z');

  it('schedules retry with backoff before max attempts', () => {
    expect(resolveAiJobFailure(0, now)).toEqual({
      status: 'pending',
      attemptCount: 1,
      nextAttemptAt: '2026-05-20T12:05:00.000Z',
    });

    expect(resolveAiJobFailure(1, now)).toEqual({
      status: 'pending',
      attemptCount: 2,
      nextAttemptAt: '2026-05-20T12:15:00.000Z',
    });
  });

  it('marks failed after the third attempt', () => {
    expect(resolveAiJobFailure(2, now)).toEqual({
      status: 'failed',
      attemptCount: 3,
    });
  });

  it('uses 15 minute backoff for later attempts', () => {
    expect(getAiJobBackoffIso(99, now)).toBe('2026-05-20T12:15:00.000Z');
  });
});

describe('isAiJobDue', () => {
  it('returns false when next_attempt_at is in the future', () => {
    expect(
      isAiJobDue('2026-05-20T13:00:00.000Z', '2026-05-20T12:00:00.000Z'),
    ).toBe(false);
  });

  it('returns true when next_attempt_at has passed', () => {
    expect(
      isAiJobDue('2026-05-20T11:00:00.000Z', '2026-05-20T12:00:00.000Z'),
    ).toBe(true);
  });
});

describe('AI_JOB_MAX_ATTEMPTS', () => {
  it('matches worker cap of three tries', () => {
    expect(AI_JOB_MAX_ATTEMPTS).toBe(3);
  });
});
