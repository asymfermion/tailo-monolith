import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authSessionAccess';
import { isUpsertPetResponse, type UpsertPetResponse } from '@tailo/shared';
import { uploadToSignedUrl } from '@/modules/sync/uploadToSignedUrl';

import {
  loadLocalPetProfile,
  saveLocalPetProfileWithRemoteId,
  type LocalPetProfile,
} from './petProfile';

export type SyncRemotePetProfileResult =
  | { status: 'skipped' }
  | { status: 'no_profile' }
  | { status: 'incomplete_profile' }
  | { status: 'synced'; response: UpsertPetResponse }
  | { status: 'error'; message: string };

function isProfileReadyForSync(
  profile: LocalPetProfile | null,
): profile is LocalPetProfile {
  return Boolean(profile?.name.trim() && profile.type);
}

/**
 * Upserts the local pet profile to the server (idempotent by source_local_pet_id).
 */
export async function syncRemotePetProfileIfNeeded(): Promise<SyncRemotePetProfileResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session) {
    return { status: 'skipped' };
  }

  const profile = await loadLocalPetProfile();

  if (!profile) {
    return { status: 'no_profile' };
  }

  if (!isProfileReadyForSync(profile)) {
    return { status: 'incomplete_profile' };
  }

  try {
    // Upload portrait if we have one that hasn't been pushed to cloud yet
    let portraitCloudUrl = profile.portraitCloudUrl;
    if (profile.portraitUri !== null && portraitCloudUrl === null) {
      try {
        const uploadUrlResult = await invokeTailoApi('upload-portrait');
        const p =
          !('error' in uploadUrlResult) && uploadUrlResult.ok
            ? (uploadUrlResult.payload as Record<string, unknown>)
            : null;
        if (
          p !== null &&
          typeof p.signed_upload_url === 'string' &&
          typeof p.portrait_url === 'string'
        ) {
          await uploadToSignedUrl(p.signed_upload_url, profile.portraitUri);
          portraitCloudUrl = p.portrait_url;
        }
      } catch {
        // Portrait upload failure must not block pet profile sync
      }
    }

    const result = await invokeTailoApi('upsert-pet', {
      source_local_pet_id: profile.petId,
      name: profile.name.trim(),
      type: profile.type,
      gender: profile.gender,
      birthday: profile.birthday,
      profile_photo_local_asset_id: profile.profilePhotoLocalAssetId,
      portrait_url: portraitCloudUrl,
    });

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(payload, `Pet sync failed (${status}).`),
      };
    }

    if (!isUpsertPetResponse(payload)) {
      return {
        status: 'error',
        message: 'Invalid pet sync response from server.',
      };
    }

    await saveLocalPetProfileWithRemoteId(
      { ...profile, portraitCloudUrl },
      payload.pet_id,
    );

    return { status: 'synced', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Could not sync pet profile.',
    };
  }
}
