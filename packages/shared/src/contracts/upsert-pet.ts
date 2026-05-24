import { parsePetBirthdayIso } from '../petBirthday.ts';
import type { PetGender, PetType } from '../types/pet.ts';

/** Payload for `api-pet` action `upsert-pet` */
export type UpsertPetRequest = {
  source_local_pet_id: string;
  name: string;
  type: PetType;
  gender?: PetGender | null;
  birthday?: string | null;
};

/** Success response from upsert-pet */
export type UpsertPetResponse = {
  pet_id: string;
  created: boolean;
};

export function parseUpsertPetRequest(body: unknown): UpsertPetRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sourceLocalPetId = Reflect.get(body, 'source_local_pet_id');
  const name = Reflect.get(body, 'name');
  const type = Reflect.get(body, 'type');
  const gender = Reflect.get(body, 'gender');
  const birthday = Reflect.get(body, 'birthday');

  if (typeof sourceLocalPetId !== 'string' || sourceLocalPetId.trim() === '') {
    return null;
  }

  if (typeof name !== 'string' || name.trim() === '') {
    return null;
  }

  if (type !== 'dog' && type !== 'cat') {
    return null;
  }

  if (
    gender !== undefined &&
    gender !== null &&
    gender !== 'male' &&
    gender !== 'female' &&
    gender !== 'unknown'
  ) {
    return null;
  }

  if (birthday !== undefined && birthday !== null) {
    if (
      typeof birthday !== 'string' ||
      parsePetBirthdayIso(birthday) === null
    ) {
      return null;
    }
  }

  const request: UpsertPetRequest = {
    source_local_pet_id: sourceLocalPetId.trim(),
    name: name.trim(),
    type,
    gender: gender ?? null,
  };

  if (birthday !== undefined) {
    request.birthday = parsePetBirthdayIso(
      typeof birthday === 'string' ? birthday : null,
    );
  }

  return request;
}

export function isUpsertPetResponse(
  value: unknown,
): value is UpsertPetResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof Reflect.get(value, 'pet_id') === 'string' &&
    typeof Reflect.get(value, 'created') === 'boolean'
  );
}
