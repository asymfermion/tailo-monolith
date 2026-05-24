import { describe, expect, it } from 'vitest';

import { isGetPetResponse, isRemotePetSummary } from './get-pet';

describe('get-pet contracts', () => {
  it('accepts a valid pet summary', () => {
    expect(
      isRemotePetSummary({
        pet_id: 'pet-1',
        source_local_pet_id: 'local_pet_1',
        name: 'Mochi',
        type: 'cat',
        gender: null,
        birthday: '2020-05-01',
        updated_at: '2026-05-19T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('accepts null pet in response', () => {
    expect(isGetPetResponse({ pet: null })).toBe(true);
  });

  it('rejects invalid pet type', () => {
    expect(
      isRemotePetSummary({
        pet_id: 'pet-1',
        source_local_pet_id: 'local_pet_1',
        name: 'Mochi',
        type: 'bird',
        gender: null,
        birthday: null,
        updated_at: '2026-05-19T00:00:00.000Z',
      }),
    ).toBe(false);
  });
});
