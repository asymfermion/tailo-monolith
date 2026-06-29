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
      'pet_id, app_user_id, source_local_pet_id, profile_photo_local_asset_id, name, type, gender, birthday',
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
    const newPetId = crypto.randomUUID();
    const { error: insertError } = await adminClient.from('pets').insert({
      pet_id: newPetId,
      app_user_id: appUser.appUserId,
      source_local_pet_id: body.source_local_pet_id,
      profile_photo_local_asset_id: body.profile_photo_local_asset_id ?? null,
      portrait_url: body.portrait_url ?? null,
      name: body.name,
      type: body.type,
      gender: body.gender ?? null,
      birthday: body.birthday ?? null,
      updated_at: now,
    });

    if (insertError) {
      // 23505 = unique_violation: a concurrent request created the row first — re-read it.
      if (insertError.code === '23505') {
        const { data: racedRow } = await adminClient
          .from('pets')
          .select('pet_id')
          .eq('app_user_id', appUser.appUserId)
          .eq('source_local_pet_id', body.source_local_pet_id)
          .maybeSingle();

        if (!racedRow) {
          return jsonResponse({ error: insertError.message }, 500);
        }

        log.info('upsert_pet_race_ok', { petId: racedRow.pet_id });
        return jsonResponse({ pet_id: racedRow.pet_id, created: true });
      }

      return jsonResponse({ error: insertError.message }, 500);
    }

    log.info('upsert_pet_created', { petId: newPetId });
    return jsonResponse({ pet_id: newPetId, created: true });
  }

  const { error: updateError } = await adminClient
    .from('pets')
    .update({
      profile_photo_local_asset_id: body.profile_photo_local_asset_id ?? null,
      portrait_url: body.portrait_url ?? null,
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
