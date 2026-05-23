import { resolveUpsertPetProfile } from '../../../../packages/backend-core/src/usecases/upsertPetProfile.ts';
import { parseUpsertPetRequest } from '../../../../packages/shared/src/contracts/upsert-pet.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

export const handleUpsertPet: ApiHandler = async ({ user, log, payload }) => {
  const body = parseUpsertPetRequest(payload);

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  log.info('upsert_pet_request', {
    appUserId: appUser.appUserId,
    sourceLocalPetId: body.source_local_pet_id,
    type: body.type,
  });

  const { data: existingRow, error: lookupError } = await adminClient
    .from('pets')
    .select(
      'pet_id, app_user_id, source_local_pet_id, name, type, gender, birthday',
    )
    .eq('app_user_id', appUser.appUserId)
    .eq('source_local_pet_id', body.source_local_pet_id)
    .maybeSingle();

  if (lookupError) {
    return jsonResponse({ error: lookupError.message }, 500);
  }

  const decision = resolveUpsertPetProfile(
    {
      callerAppUserId: appUser.appUserId,
      sourceLocalPetId: body.source_local_pet_id,
      name: body.name,
      type: body.type,
      gender: body.gender ?? null,
    },
    existingRow
      ? {
          petId: existingRow.pet_id,
          appUserId: existingRow.app_user_id,
          sourceLocalPetId: existingRow.source_local_pet_id,
          name: existingRow.name,
          type: existingRow.type,
          gender: existingRow.gender,
        }
      : null,
  );

  if (!decision.ok) {
    const status = decision.code === 'conflict' ? 409 : 400;
    return jsonResponse(
      { error: decision.message, code: decision.code },
      status,
    );
  }

  const now = new Date().toISOString();

  if (decision.created) {
    const petId = crypto.randomUUID();
    const { error: insertError } = await adminClient.from('pets').insert({
      pet_id: petId,
      app_user_id: appUser.appUserId,
      source_local_pet_id: body.source_local_pet_id,
      name: body.name,
      type: body.type,
      gender: body.gender ?? null,
      birthday: body.birthday ?? null,
      updated_at: now,
    });

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    log.info('upsert_pet_created', { petId });
    return jsonResponse({ pet_id: petId, created: true });
  }

  const { error: updateError } = await adminClient
    .from('pets')
    .update({
      name: body.name,
      type: body.type,
      gender: body.gender ?? null,
      birthday: body.birthday ?? null,
      updated_at: now,
    })
    .eq('pet_id', decision.petId)
    .eq('app_user_id', appUser.appUserId);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  log.info('upsert_pet_updated', { petId: decision.petId });
  return jsonResponse({
    pet_id: decision.petId,
    created: false,
  });
};
