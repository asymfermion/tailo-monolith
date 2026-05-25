import { invokeTailoApi } from '@/lib/invokeTailoApi';
import { logAuth } from '@/modules/auth/authLogger';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';
import {
  isGetPetResponse,
  normalizeRemotePetSummary,
  type RemotePetSummary,
} from '@tailo/shared';

import {
  isLocalPetProfileReady,
  loadLocalPetProfile,
  saveLocalPetProfileWithRemoteId,
  type LocalPetProfile,
} from './petProfile';

export type PullRemotePetProfileResult =
  | { status: 'skipped' }
  | { status: 'no_remote_pet' }
  | { status: 'already_hydrated' }
  | { status: 'pulled'; profile: LocalPetProfile }
  | { status: 'error'; message: string };

export type PullRemotePetProfileOptions = {
  /**
   * Returning-account sign-in should let the cloud pet win even when this
   * device has partial local onboarding/profile state.
   */
  force?: boolean;
};

async function fetchRemotePetSummary(): Promise<
  RemotePetSummary | null | 'error'
> {
  const result = await invokeTailoApi('get-pet');

  if ('error' in result) {
    return 'error';
  }

  if (!result.ok) {
    return 'error';
  }

  if (!isGetPetResponse(result.payload)) {
    return 'error';
  }

  return result.payload.pet
    ? normalizeRemotePetSummary(result.payload.pet)
    : null;
}

/**
 * Downloads the account pet from the server when this device has no ready profile.
 */
export async function pullRemotePetProfileIfNeeded(
  options: PullRemotePetProfileOptions = {},
): Promise<PullRemotePetProfileResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!isLinkedRemoteAccount(session)) {
    return { status: 'skipped' };
  }

  const existing = await loadLocalPetProfile();

  if (
    !options.force &&
    isLocalPetProfileReady(existing) &&
    existing.remotePetId
  ) {
    return { status: 'already_hydrated' };
  }

  const remote = await fetchRemotePetSummary();

  if (remote === 'error') {
    return {
      status: 'error',
      message: 'Could not load pet profile from cloud.',
    };
  }

  if (!remote) {
    logAuth('Remote pet pull: no pet on account');
    return { status: 'no_remote_pet' };
  }

  const now = new Date().toISOString();
  const isSameRemotePet =
    existing?.remotePetId === remote.pet_id ||
    existing?.petId === remote.source_local_pet_id;
  const profile: LocalPetProfile = {
    petId:
      options.force && !isSameRemotePet
        ? remote.source_local_pet_id
        : (existing?.petId ?? remote.source_local_pet_id),
    name: remote.name,
    type: remote.type,
    gender: remote.gender,
    birthday: remote.birthday,
    profilePhotoLocalAssetId:
      remote.profile_photo_local_asset_id ??
      (isSameRemotePet ? (existing?.profilePhotoLocalAssetId ?? null) : null),
    profilePhotoUri: isSameRemotePet
      ? (existing?.profilePhotoUri ?? null)
      : null,
    remotePetId: remote.pet_id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await saveLocalPetProfileWithRemoteId(profile, remote.pet_id);
  logAuth('Remote pet profile hydrated on device', {
    petId: remote.pet_id,
    name: remote.name,
  });

  return { status: 'pulled', profile };
}
