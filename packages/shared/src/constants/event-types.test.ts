import { describe, expect, it } from 'vitest';

import { EVENT_TYPES, type EventType } from './event-types';

describe('EVENT_TYPES', () => {
  it('includes all MVP event types', () => {
    expect(EVENT_TYPES).toEqual(['walk', 'play', 'rest', 'eating', 'unknown']);
  });

  it('types EventType as a union of constants', () => {
    const walk: EventType = 'walk';
    expect(EVENT_TYPES).toContain(walk);
  });
});
