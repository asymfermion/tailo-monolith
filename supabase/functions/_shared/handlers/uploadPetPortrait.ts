import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

const BUCKET = 'pet-portraits';

export const handleUploadPetPortrait: ApiHandler = async ({ user, log }) => {
  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  const path = `${appUser.appUserId}/portrait.jpg`;

  const { data, error } = await adminClient.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return jsonResponse(
      { error: error?.message ?? 'Could not create upload URL.' },
      500,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const portraitUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

  log.info('portrait_upload_url_created', { appUserId: appUser.appUserId });

  return jsonResponse({
    signed_upload_url: data.signedUrl,
    portrait_url: portraitUrl,
  });
};
