import { getTimelineDateBucket } from './dateBuckets';

const NOW = new Date(2026, 5, 28, 12, 0, 0); // 2026-06-28 12:00 local

describe('getTimelineDateBucket', () => {
  it('buckets the same calendar day as today', () => {
    expect(
      getTimelineDateBucket(new Date(2026, 5, 28, 1).toISOString(), NOW),
    ).toBe('today');
  });

  it('clamps future timestamps to today', () => {
    expect(
      getTimelineDateBucket(new Date(2026, 5, 30, 9).toISOString(), NOW),
    ).toBe('today');
  });

  it('buckets the previous calendar day as yesterday', () => {
    expect(
      getTimelineDateBucket(new Date(2026, 5, 27, 23).toISOString(), NOW),
    ).toBe('yesterday');
  });

  it('buckets within the last week as thisWeek', () => {
    expect(
      getTimelineDateBucket(new Date(2026, 5, 23, 10).toISOString(), NOW),
    ).toBe('thisWeek');
  });

  it('buckets seven-plus days back as earlier', () => {
    expect(
      getTimelineDateBucket(new Date(2026, 5, 21, 10).toISOString(), NOW),
    ).toBe('earlier');
    expect(
      getTimelineDateBucket(new Date(2026, 4, 1, 10).toISOString(), NOW),
    ).toBe('earlier');
  });

  it('falls back to earlier for an unparseable timestamp', () => {
    expect(getTimelineDateBucket('not-a-date', NOW)).toBe('earlier');
  });
});
