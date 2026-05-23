import { describe, expect, it } from 'vitest';

import { isUpsertPetResponse, parseUpsertPetRequest } from './upsert-pet';

describe('parseUpsertPetRequest', () => {
  it('parses a valid body', () => {
    expect(
      parseUpsertPetRequest({
        source_local_pet_id: 'local_pet_abc',
        name: 'Milo',
        type: 'dog',
        gender: 'unknown',
      }),
    ).toEqual({
      source_local_pet_id: 'local_pet_abc',
      name: 'Milo',
      type: 'dog',
      gender: 'unknown',
    });
  });

  it('parses optional birthday', () => {
    expect(
      parseUpsertPetRequest({
        source_local_pet_id: 'local_pet_abc',
        name: 'Milo',
        type: 'dog',
        birthday: '2020-05-09',
      }),
    ).toMatchObject({
      birthday: '2020-05-09',
    });
  });

  it('rejects invalid bodies', () => {
    expect(parseUpsertPetRequest(null)).toBeNull();
    expect(parseUpsertPetRequest({ name: 'Milo', type: 'dog' })).toBeNull();
    expect(
      parseUpsertPetRequest({
        source_local_pet_id: 'local_pet_abc',
        name: '',
        type: 'dog',
      }),
    ).toBeNull();
    expect(
      parseUpsertPetRequest({
        source_local_pet_id: 'local_pet_abc',
        name: 'Milo',
        type: 'dog',
        birthday: '2020-13-01',
      }),
    ).toBeNull();
  });
});

describe('isUpsertPetResponse', () => {
  it('accepts valid responses', () => {
    expect(isUpsertPetResponse({ pet_id: 'uuid', created: false })).toBe(true);
  });
});
