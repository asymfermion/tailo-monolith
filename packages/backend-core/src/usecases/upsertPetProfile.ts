export type PetProfileRow = {
  petId: string;
  appUserId: string;
  sourceLocalPetId: string;
  name: string;
  type: 'dog' | 'cat';
  gender: string | null;
};

export type UpsertPetProfileInput = {
  callerAppUserId: string;
  sourceLocalPetId: string;
  name: string;
  type: 'dog' | 'cat';
  gender?: string | null;
};

export type UpsertPetProfileSuccess = {
  ok: true;
  petId: string;
  created: boolean;
};

export type UpsertPetProfileFailure = {
  ok: false;
  code: 'invalid_input' | 'conflict';
  message: string;
};

export type UpsertPetProfileResult =
  UpsertPetProfileSuccess | UpsertPetProfileFailure;

const LOCAL_PET_PREFIX = 'local_pet_';

export function resolveUpsertPetProfile(
  input: UpsertPetProfileInput,
  existing: PetProfileRow | null,
): UpsertPetProfileResult {
  const name = input.name.trim();
  const sourceLocalPetId = input.sourceLocalPetId.trim();

  if (!sourceLocalPetId.startsWith(LOCAL_PET_PREFIX)) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'source_local_pet_id must start with local_pet_.',
    };
  }

  if (!name) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'Pet name is required.',
    };
  }

  if (input.type !== 'dog' && input.type !== 'cat') {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'Pet type must be dog or cat.',
    };
  }

  if (!existing) {
    return {
      ok: true,
      petId: '',
      created: true,
    };
  }

  if (existing.appUserId !== input.callerAppUserId) {
    return {
      ok: false,
      code: 'conflict',
      message: 'This pet profile belongs to another account.',
    };
  }

  return {
    ok: true,
    petId: existing.petId,
    created: false,
  };
}
