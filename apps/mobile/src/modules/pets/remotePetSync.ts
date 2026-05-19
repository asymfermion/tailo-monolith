import { appEnv } from '@/lib/env';
import {
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { isUpsertPetResponse, type UpsertPetResponse } from '@tailo/shared';

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

  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return { status: 'error', message: 'Missing auth session token.' };
  }

  try {
    const response = await fetch(
      `${appEnv.supabaseUrl}/functions/v1/upsert-pet`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          apikey: appEnv.supabaseAnonKey,
        },
        body: JSON.stringify({
          source_local_pet_id: profile.petId,
          name: profile.name.trim(),
          type: profile.type,
          gender: profile.gender,
        }),
      },
    );

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload &&
        typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Pet sync failed (${response.status}).`;

      return { status: 'error', message };
    }

    if (!isUpsertPetResponse(payload)) {
      return {
        status: 'error',
        message: 'Invalid pet sync response from server.',
      };
    }

    await saveLocalPetProfileWithRemoteId(profile, payload.pet_id);

    return { status: 'synced', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Could not sync pet profile.',
    };
  }
}
