import { describe, expect, it } from 'vitest';

import {
  composePetBirthdayIso,
  isPetBirthdayIso,
  parsePetBirthdayIso,
  splitPetBirthdayIso,
} from './petBirthday';

describe('petBirthday', () => {
  it('validates and composes ISO calendar dates', () => {
    expect(isPetBirthdayIso('2020-02-29')).toBe(true);
    expect(isPetBirthdayIso('2020-02-30')).toBe(false);
    expect(composePetBirthdayIso({ year: 2020, month: 5, day: 9 })).toBe(
      '2020-05-09',
    );
  });

  it('parses and splits birthdays', () => {
    expect(parsePetBirthdayIso(' 2020-05-09 ')).toBe('2020-05-09');
    expect(parsePetBirthdayIso('invalid')).toBeNull();
    expect(splitPetBirthdayIso('2020-05-09')).toEqual({
      year: 2020,
      month: 5,
      day: 9,
    });
  });
});
