import {
  formatEventType,
  formatPetType,
  formatTimestamp,
} from './formatMoment';

describe('formatMoment', () => {
  it('formats timestamps for display', () => {
    expect(formatTimestamp('2026-05-17T15:30:00.000Z')).toMatch(/May/);
  });

  it('formats event types', () => {
    expect(formatEventType('walk')).toBe('Walk');
    expect(formatEventType('unknown')).toBe('Moment');
  });

  it('formats pet types', () => {
    expect(formatPetType('dog')).toBe('Dog');
    expect(formatPetType('cat')).toBe('Cat');
  });
});
