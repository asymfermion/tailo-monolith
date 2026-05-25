import {
  isGetPetResponse,
  normalizeRemotePetSummary,
  type GetPetResponse,
} from '../../../../packages/shared/src/contracts/get-pet.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

export const handleGetPet: ApiHandler = async ({ user, log }) => {
  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  const { data: rows, error } = await adminClient
    .from('pets')
    .select(
      'pet_id, source_local_pet_id, profile_photo_local_asset_id, name, type, gender, birthday, updated_at',
    )
    .eq('app_user_id', appUser.appUserId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const row = rows?.[0];

  if (!row) {
    log.info('get_pet_empty', { appUserId: appUser.appUserId });
    return jsonResponse({ pet: null } satisfies GetPetResponse);
  }

  const pet = normalizeRemotePetSummary({
    pet_id: row.pet_id,
    source_local_pet_id: row.source_local_pet_id,
    profile_photo_local_asset_id: row.profile_photo_local_asset_id ?? null,
    name: row.name,
    type: row.type,
    gender: row.gender,
    birthday: row.birthday,
    updated_at: row.updated_at,
  });

  log.info('get_pet_ok', { appUserId: appUser.appUserId, petId: pet.pet_id });

  return jsonResponse({ pet } satisfies GetPetResponse);
};
