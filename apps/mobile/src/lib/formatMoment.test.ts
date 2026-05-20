import { setAppLocale } from '@/i18n';

import {
  formatEventType,
  formatPetType,
  formatTimestamp,
} from './formatMoment';

describe('formatMoment', () => {
  beforeEach(async () => {
    await setAppLocale('en');
  });

  it('formats timestamps for display', () => {
    expect(formatTimestamp('2026-05-17T15:30:00.000Z')).toMatch(/May/);
  });

  it('formats timestamps in Simplified Chinese', async () => {
    await setAppLocale('zh-Hans');

    expect(formatTimestamp('2026-05-17T15:30:00.000Z')).toMatch(/5/);
  });

  it('formats event types', () => {
    expect(formatEventType('walk')).toBe('Walk');
    expect(formatEventType('unknown')).toBe('Moment');
  });

  it('formats event types in Simplified Chinese', async () => {
    await setAppLocale('zh-Hans');

    expect(formatEventType('walk')).toBe('散步');
    expect(formatEventType('unknown')).toBe('瞬间');
  });

  it('formats pet types', () => {
    expect(formatPetType('dog')).toBe('Dog');
    expect(formatPetType('cat')).toBe('Cat');
  });
});
