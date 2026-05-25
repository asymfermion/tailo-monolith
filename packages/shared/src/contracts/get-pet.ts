import type { PetGender, PetType } from '../types/pet.ts';
import { parsePetBirthdayIso } from '../petBirthday.ts';

/** Primary pet row for the signed-in account (`api-pet` action `get-pet`). */
export type RemotePetSummary = {
  pet_id: string;
  source_local_pet_id: string;
  profile_photo_local_asset_id: string | null;
  name: string;
  type: PetType;
  gender: PetGender | null;
  birthday: string | null;
  updated_at: string;
};

export type GetPetResponse = {
  pet: RemotePetSummary | null;
};

export function isRemotePetSummary(value: unknown): value is RemotePetSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const type = Reflect.get(value, 'type');
  const gender = Reflect.get(value, 'gender');
  const birthday = Reflect.get(value, 'birthday');

  return (
    typeof Reflect.get(value, 'pet_id') === 'string' &&
    typeof Reflect.get(value, 'source_local_pet_id') === 'string' &&
    (Reflect.get(value, 'profile_photo_local_asset_id') === null ||
      Reflect.get(value, 'profile_photo_local_asset_id') === undefined ||
      typeof Reflect.get(value, 'profile_photo_local_asset_id') === 'string') &&
    typeof Reflect.get(value, 'name') === 'string' &&
    (type === 'dog' || type === 'cat') &&
    (gender === null ||
      gender === 'male' ||
      gender === 'female' ||
      gender === 'unknown') &&
    (birthday === null ||
      birthday === undefined ||
      typeof birthday === 'string') &&
    typeof Reflect.get(value, 'updated_at') === 'string'
  );
}

export function isGetPetResponse(value: unknown): value is GetPetResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const pet = Reflect.get(value, 'pet');

  return pet === null || isRemotePetSummary(pet);
}

export function normalizeRemotePetSummary(
  value: RemotePetSummary,
): RemotePetSummary {
  return {
    ...value,
    birthday: parsePetBirthdayIso(value.birthday),
  };
}
