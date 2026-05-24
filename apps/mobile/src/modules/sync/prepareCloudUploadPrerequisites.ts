import { logTailo } from '@/lib/tailoLogger';
import { ensureAnonymousCloudAccountIfNeeded } from '@/modules/auth/anonymousCloudAccount';
import { isRemoteAuthConfigured } from '@/modules/auth/authService';
import {
  isLocalPetProfileReady,
  loadLocalPetProfile,
} from '@/modules/pets/petProfile';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets/remotePetSync';

export type PrepareCloudUploadPrerequisitesResult = {
  remotePetId: string | null;
};

/**
 * Ensures anonymous cloud identity and upserts the local pet before media upload.
 * Safe to call when the pet profile is incomplete — returns null without side effects.
 */
export async function prepareCloudUploadPrerequisites(): Promise<PrepareCloudUploadPrerequisitesResult> {
  if (!isRemoteAuthConfigured()) {
    return { remotePetId: null };
  }

  const profile = await loadLocalPetProfile();

  if (!isLocalPetProfileReady(profile)) {
    return { remotePetId: null };
  }

  const accountResult = await ensureAnonymousCloudAccountIfNeeded();

  if (accountResult.status === 'error') {
    logTailo('Sync', 'Anonymous cloud account ensure failed before upload', {
      message: accountResult.message,
    });
    return { remotePetId: profile.remotePetId ?? null };
  }

  const petSyncResult = await syncRemotePetProfileIfNeeded();

  if (petSyncResult.status === 'synced') {
    return { remotePetId: petSyncResult.response.pet_id };
  }

  if (petSyncResult.status === 'error') {
    logTailo('Sync', 'Remote pet sync failed before upload', {
      message: petSyncResult.message,
    });
  }

  const refreshedProfile = await loadLocalPetProfile();

  return { remotePetId: refreshedProfile?.remotePetId ?? null };
}
