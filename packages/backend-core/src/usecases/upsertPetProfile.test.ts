import { describe, expect, it } from 'vitest';

import { resolveUpsertPetProfile } from './upsertPetProfile';

describe('resolveUpsertPetProfile', () => {
  it('creates when no row exists', () => {
    expect(
      resolveUpsertPetProfile(
        {
          callerUserId: 'user-a',
          sourceLocalPetId: 'local_pet_abc',
          name: 'Milo',
          type: 'dog',
        },
        null,
      ),
    ).toEqual({
      ok: true,
      petId: '',
      created: true,
    });
  });

  it('is idempotent for the same user', () => {
    expect(
      resolveUpsertPetProfile(
        {
          callerUserId: 'user-a',
          sourceLocalPetId: 'local_pet_abc',
          name: 'Milo',
          type: 'dog',
        },
        {
          petId: 'pet-uuid',
          userId: 'user-a',
          sourceLocalPetId: 'local_pet_abc',
          name: 'Old',
          type: 'dog',
          gender: null,
        },
      ),
    ).toEqual({
      ok: true,
      petId: 'pet-uuid',
      created: false,
    });
  });

  it('rejects cross-user source ids', () => {
    expect(
      resolveUpsertPetProfile(
        {
          callerUserId: 'user-b',
          sourceLocalPetId: 'local_pet_abc',
          name: 'Milo',
          type: 'cat',
        },
        {
          petId: 'pet-uuid',
          userId: 'user-a',
          sourceLocalPetId: 'local_pet_abc',
          name: 'Milo',
          type: 'dog',
          gender: null,
        },
      ),
    ).toMatchObject({
      ok: false,
      code: 'conflict',
    });
  });
});
