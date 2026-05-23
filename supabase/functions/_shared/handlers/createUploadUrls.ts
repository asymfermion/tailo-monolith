import { UPLOAD_SIGNED_URL_TTL_SECONDS } from '../../../../packages/shared/src/constants/upload.ts';
import { validateUploadRequest } from '../../../../packages/backend-core/src/usecases/validateUploadRequest.ts';
import {
  parseCreateUploadUrlsRequest,
  type CreateUploadUrlsAssetResponse,
} from '../../../../packages/shared/src/contracts/create-upload-urls.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

function buildStoragePaths(
  appUserId: string,
  petId: string,
  eventId: string,
  sourceLocalAssetId: string,
) {
  const base = `${appUserId}/${petId}/${eventId}/${sourceLocalAssetId}`;
  return {
    storagePath: `${base}/original.jpg`,
    thumbnailPath: `${base}/thumb.jpg`,
  };
}

export const handleCreateUploadUrls: ApiHandler = async ({
  user,
  log,
  payload,
}) => {
  const body = parseCreateUploadUrlsRequest(payload);

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 422);
  }

  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  log.info('upload_urls_request', {
    appUserId: appUser.appUserId,
    sourceLocalEventId: body.source_local_event_id,
    assetCount: body.assets.length,
  });

  const { data: petRow, error: petError } = await adminClient
    .from('pets')
    .select('pet_id, app_user_id')
    .eq('pet_id', body.pet_id)
    .maybeSingle();

  if (petError) {
    return jsonResponse({ error: petError.message }, 500);
  }

  const validation = validateUploadRequest({
    callerAppUserId: appUser.appUserId,
    petId: body.pet_id,
    sourceLocalEventId: body.source_local_event_id,
    assets: body.assets.map((asset) => ({
      sourceLocalAssetId: asset.source_local_asset_id,
    })),
    petOwnerAppUserId: petRow?.app_user_id ?? null,
  });

  if (!validation.ok) {
    const status = validation.code === 'forbidden' ? 403 : 422;
    return jsonResponse({ error: validation.message, code: validation.code }, status);
  }

  const { data: existingEvent, error: eventLookupError } = await adminClient
    .from('events')
    .select('event_id, app_user_id, pet_id')
    .eq('app_user_id', appUser.appUserId)
    .eq('source_local_event_id', body.source_local_event_id)
    .maybeSingle();

  if (eventLookupError) {
    return jsonResponse({ error: eventLookupError.message }, 500);
  }

  let eventId = existingEvent?.event_id as string | undefined;

  if (!eventId) {
    eventId = crypto.randomUUID();
    const { error: insertEventError } = await adminClient.from('events').insert({
      event_id: eventId,
      app_user_id: appUser.appUserId,
      pet_id: body.pet_id,
      source_local_event_id: body.source_local_event_id,
      updated_at: new Date().toISOString(),
    });

    if (insertEventError) {
      return jsonResponse({ error: insertEventError.message }, 500);
    }
  } else if (existingEvent.pet_id !== body.pet_id) {
    return jsonResponse(
      { error: 'Event already exists for a different pet.', code: 'conflict' },
      409,
    );
  }

  const expiresAt = new Date(
    Date.now() + UPLOAD_SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();

  const signedAssets: CreateUploadUrlsAssetResponse[] = [];

  for (const asset of body.assets) {
    const { storagePath, thumbnailPath } = buildStoragePaths(
      appUser.appUserId,
      body.pet_id,
      eventId,
      asset.source_local_asset_id,
    );

    const [originalSigned, thumbnailSigned] = await Promise.all([
      adminClient.storage.from('event-media').createSignedUploadUrl(storagePath, {
        upsert: true,
      }),
      adminClient.storage.from('event-media').createSignedUploadUrl(thumbnailPath, {
        upsert: true,
      }),
    ]);

    if (originalSigned.error || thumbnailSigned.error) {
      return jsonResponse(
        {
          error:
            originalSigned.error?.message ??
            thumbnailSigned.error?.message ??
            'Could not create signed upload URLs.',
        },
        500,
      );
    }

    signedAssets.push({
      source_local_asset_id: asset.source_local_asset_id,
      original_upload_url: originalSigned.data.signedUrl,
      thumbnail_upload_url: thumbnailSigned.data.signedUrl,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      expires_at: expiresAt,
    });
  }

  log.info('upload_urls_ok', {
    eventId,
    assetCount: signedAssets.length,
  });

  return jsonResponse({
    event_id: eventId,
    assets: signedAssets,
  });
};
