import { parsePetBirthdayIso } from '../petBirthday.ts';
import type { PetGender, PetType } from '../types/pet.ts';

/** Payload for `api-pet` action `upsert-pet` */
export type UpsertPetRequest = {
  source_local_pet_id: string;
  name: string;
  type: PetType;
  gender?: PetGender | null;
  birthday?: string | null;
  profile_photo_local_asset_id?: string | null;
  portrait_url?: string | null;
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
  const profilePhotoLocalAssetId = Reflect.get(
    body,
    'profile_photo_local_asset_id',
  );
  const portraitUrl = Reflect.get(body, 'portrait_url');

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

  if (
    profilePhotoLocalAssetId !== undefined &&
    profilePhotoLocalAssetId !== null &&
    (typeof profilePhotoLocalAssetId !== 'string' ||
      profilePhotoLocalAssetId.trim() === '')
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

  if (profilePhotoLocalAssetId !== undefined) {
    request.profile_photo_local_asset_id =
      typeof profilePhotoLocalAssetId === 'string'
        ? profilePhotoLocalAssetId.trim()
        : null;
  }

  if (portraitUrl !== undefined) {
    request.portrait_url =
      typeof portraitUrl === 'string' ? portraitUrl.trim() : null;
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
