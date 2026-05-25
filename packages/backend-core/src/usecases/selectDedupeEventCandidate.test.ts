import { describe, expect, it } from 'vitest';

import { selectDedupeEventCandidate } from './selectDedupeEventCandidate';

describe('selectDedupeEventCandidate', () => {
  it('prefers higher fingerprint overlap in timestamp window', () => {
    const picked = selectDedupeEventCandidate('2026-05-25T12:00:00.000Z', [
      {
        eventId: 'event-a',
        timestamp: '2026-05-25T12:00:20.000Z',
        fingerprintMatchCount: 1,
      },
      {
        eventId: 'event-b',
        timestamp: '2026-05-25T12:01:00.000Z',
        fingerprintMatchCount: 2,
      },
    ]);

    expect(picked?.eventId).toBe('event-b');
  });

  it('returns null when candidates are outside merge window', () => {
    const picked = selectDedupeEventCandidate('2026-05-25T12:00:00.000Z', [
      {
        eventId: 'event-a',
        timestamp: '2026-05-25T12:10:01.000Z',
        fingerprintMatchCount: 5,
      },
    ]);

    expect(picked).toBeNull();
  });
});
