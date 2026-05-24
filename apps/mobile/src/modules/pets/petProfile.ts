import { parsePetBirthdayIso } from '@tailo/shared';

import { getDatabase } from '@/db';
import { logTailo } from '@/lib/tailoLogger';
import { type SecureStorage } from '@/modules/auth/secureStorage';
import { workspaceSecureStorage } from '@/modules/auth/localWorkspace';
import { LOCAL_PET_PROFILE_KEY } from './keys';

export type LocalPetType = 'dog' | 'cat';
export type LocalPetGender = 'female' | 'male' | 'unknown';

export type LocalPetProfile = {
  petId: string;
  name: string;
  type: LocalPetType;
  gender: LocalPetGender | null;
  /** ISO calendar date YYYY-MM-DD */
  birthday: string | null;
  profilePhotoLocalAssetId: string | null;
  profilePhotoUri: string | null;
  /** Canonical server pet id after upsert-pet succeeds. */
  remotePetId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveLocalPetProfileInput = {
  name: string;
  type: LocalPetType;
  gender?: LocalPetGender | null;
  birthday?: string | null;
  profilePhotoLocalAssetId?: string | null;
  profilePhotoUri?: string | null;
};

export { LOCAL_PET_PROFILE_KEY } from './keys';

export function isLocalPetProfileReady(
  profile: LocalPetProfile | null,
): profile is LocalPetProfile {
  return Boolean(profile?.name.trim() && profile.type);
}

export async function hasReadyLocalPetProfile(
  storage: SecureStorage = workspaceSecureStorage,
): Promise<boolean> {
  return isLocalPetProfileReady(await loadLocalPetProfile(storage));
}

export async function loadLocalPetProfile(
  storage: SecureStorage = workspaceSecureStorage,
): Promise<LocalPetProfile | null> {
  const storedValue = await storage.getItemAsync(LOCAL_PET_PROFILE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return normalizeLocalPetProfile(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

/** After scan: user picks dog or cat; rebuilds timeline for that type only. */
export async function saveSelectedPetType(
  type: LocalPetType,
  storage: SecureStorage = workspaceSecureStorage,
): Promise<LocalPetProfile> {
  const existingProfile = await loadLocalPetProfile(storage);
  const now = new Date().toISOString();

  const profile: LocalPetProfile = {
    petId: existingProfile?.petId ?? generateLocalPetId(),
    name: existingProfile?.name ?? '',
    type,
    gender: existingProfile?.gender ?? null,
    birthday: existingProfile?.birthday ?? null,
    profilePhotoLocalAssetId: existingProfile?.profilePhotoLocalAssetId ?? null,
    profilePhotoUri: existingProfile?.profilePhotoUri ?? null,
    remotePetId: existingProfile?.remotePetId ?? null,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
  };

  await storage.setItemAsync(LOCAL_PET_PROFILE_KEY, JSON.stringify(profile));

  const database = await getDatabase();
  const rebuildPipelineForProfilePetType =
    loadRebuildPipelineForProfilePetType();
  await rebuildPipelineForProfilePetType(database, type);

  return profile;
}

export async function saveLocalPetProfile(
  input: SaveLocalPetProfileInput,
  storage: SecureStorage = workspaceSecureStorage,
): Promise<LocalPetProfile> {
  const existingProfile = await loadLocalPetProfile(storage);
  const now = new Date().toISOString();
  const profile: LocalPetProfile = {
    petId: existingProfile?.petId ?? generateLocalPetId(),
    name: input.name.trim(),
    type: input.type,
    gender: input.gender ?? null,
    birthday: parsePetBirthdayIso(input.birthday ?? existingProfile?.birthday),
    profilePhotoLocalAssetId: input.profilePhotoLocalAssetId ?? null,
    profilePhotoUri: input.profilePhotoUri ?? null,
    remotePetId: existingProfile?.remotePetId ?? null,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
  };

  await storage.setItemAsync(LOCAL_PET_PROFILE_KEY, JSON.stringify(profile));

  const shouldRebuildPipeline =
    input.type !== existingProfile?.type ||
    (!existingProfile?.type && input.type);

  if (shouldRebuildPipeline) {
    const database = await getDatabase();
    const rebuildPipelineForProfilePetType =
      loadRebuildPipelineForProfilePetType();
    await rebuildPipelineForProfilePetType(database, input.type);
  }

  if (isLocalPetProfileReady(profile)) {
    scheduleCloudUploadAfterPetProfileSave();
  }

  return profile;
}

function scheduleCloudUploadAfterPetProfileSave(): void {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { prepareCloudUploadPrerequisites } =
    require('@/modules/sync/prepareCloudUploadPrerequisites') as typeof import('@/modules/sync/prepareCloudUploadPrerequisites');
  const { runUploadQueueWorker } =
    require('@/modules/sync/uploadQueueWorker') as typeof import('@/modules/sync/uploadQueueWorker');
  /* eslint-enable @typescript-eslint/no-require-imports */

  void (async () => {
    try {
      await prepareCloudUploadPrerequisites();
      void runUploadQueueWorker();
    } catch (error) {
      logTailo('Sync', 'Background cloud upload prep failed after pet save', {
        message: error instanceof Error ? error.message : 'Unknown error.',
      });
    }
  })();
}

export async function saveLocalPetProfileWithRemoteId(
  profile: LocalPetProfile,
  remotePetId: string,
  storage: SecureStorage = workspaceSecureStorage,
): Promise<LocalPetProfile> {
  const nextProfile: LocalPetProfile = {
    ...profile,
    remotePetId,
  };

  await storage.setItemAsync(
    LOCAL_PET_PROFILE_KEY,
    JSON.stringify(nextProfile),
  );

  return nextProfile;
}

function generateLocalPetId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `local_pet_${Date.now().toString(36)}_${randomPart}`;
}

function loadRebuildPipelineForProfilePetType(): (typeof import('@/modules/eventBuilder/rebuildPipelineForProfilePetType'))['rebuildPipelineForProfilePetType'] {
  // Lazy load avoids a runtime cycle: rebuild imports event clustering, which can read the pet profile.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { rebuildPipelineForProfilePetType } =
    require('@/modules/eventBuilder/rebuildPipelineForProfilePetType') as typeof import('@/modules/eventBuilder/rebuildPipelineForProfilePetType');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return rebuildPipelineForProfilePetType;
}

function normalizeLocalPetProfile(value: unknown): LocalPetProfile | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    typeof value.petId !== 'string' ||
    typeof value.name !== 'string' ||
    !isLocalPetType(value.type)
  ) {
    return null;
  }

  return {
    petId: value.petId,
    name: value.name,
    type: value.type,
    gender: isLocalPetGender(value.gender) ? value.gender : null,
    birthday: parsePetBirthdayIso(
      typeof value.birthday === 'string' ? value.birthday : null,
    ),
    profilePhotoLocalAssetId:
      typeof value.profilePhotoLocalAssetId === 'string'
        ? value.profilePhotoLocalAssetId
        : null,
    profilePhotoUri:
      typeof value.profilePhotoUri === 'string' ? value.profilePhotoUri : null,
    remotePetId:
      typeof value.remotePetId === 'string' ? value.remotePetId : null,
    createdAt:
      typeof value.createdAt === 'string'
        ? value.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === 'string'
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function isLocalPetType(value: unknown): value is LocalPetType {
  return value === 'dog' || value === 'cat';
}

function isLocalPetGender(value: unknown): value is LocalPetGender {
  return value === 'female' || value === 'male' || value === 'unknown';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
