import { describe, expect, it } from 'vitest';

import {
  pickPlaceholderCaption,
  resolveDisplayCaption,
} from './fallbackCaptions';

describe('fallbackCaptions', () => {
  it('returns stable placeholder copy', () => {
    expect(pickPlaceholderCaption('event-1')).toMatch(/moment|memory/i);
  });

  it('prefers user caption when present', () => {
    expect(resolveDisplayCaption('Nap time', 'user', 'event-1')).toBe(
      'Nap time',
    );
  });
});
