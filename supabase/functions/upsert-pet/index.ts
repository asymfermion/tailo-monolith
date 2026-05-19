import { resolveUpsertPetProfile } from '../../../packages/backend-core/src/usecases/upsertPetProfile.ts';
import { parseUpsertPetRequest } from '../../../packages/shared/src/contracts/upsert-pet.ts';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  jsonResponse,
} from '../_shared/http.ts';
import { servePostFunction } from '../_shared/serve.ts';

servePostFunction('upsert-pet', async (request, log) => {
  const authResult = await getAuthenticatedUser(request, log);

  if ('error' in authResult) {
    return authResult.error;
  }

  const body = parseUpsertPetRequest(await request.json().catch(() => null));

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  log.info('upsert_pet_request', {
    userId: authResult.user.id,
    sourceLocalPetId: body.source_local_pet_id,
    type: body.type,
  });

  const adminClient = getServiceRoleClient();
  const { data: existingRow, error: lookupError } = await adminClient
    .from('pets')
    .select('pet_id, user_id, source_local_pet_id, name, type, gender')
    .eq('source_local_pet_id', body.source_local_pet_id)
    .maybeSingle();

  if (lookupError) {
    return jsonResponse({ error: lookupError.message }, 500);
  }

  const decision = resolveUpsertPetProfile(
    {
      callerUserId: authResult.user.id,
      sourceLocalPetId: body.source_local_pet_id,
      name: body.name,
      type: body.type,
      gender: body.gender ?? null,
    },
    existingRow
      ? {
          petId: existingRow.pet_id,
          userId: existingRow.user_id,
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
      user_id: authResult.user.id,
      source_local_pet_id: body.source_local_pet_id,
      name: body.name,
      type: body.type,
      gender: body.gender ?? null,
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
      updated_at: now,
    })
    .eq('pet_id', decision.petId)
    .eq('user_id', authResult.user.id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  log.info('upsert_pet_updated', { petId: decision.petId });
  return jsonResponse({
    pet_id: decision.petId,
    created: false,
  });
});
