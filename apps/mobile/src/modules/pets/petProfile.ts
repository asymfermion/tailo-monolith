import {
  secureStorage,
  type SecureStorage,
} from '@/modules/auth/secureStorage';
import { getDatabase } from '@/db';
import { rebuildPipelineForProfilePetType } from '@/modules/eventBuilder/rebuildPipelineForProfilePetType';

import { LOCAL_PET_PROFILE_KEY } from './keys';
import { syncRemotePetProfileIfNeeded } from './remotePetSync';

export type LocalPetType = 'dog' | 'cat';
export type LocalPetGender = 'female' | 'male' | 'unknown';

export type LocalPetProfile = {
  petId: string;
  name: string;
  type: LocalPetType;
  gender: LocalPetGender | null;
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
  profilePhotoLocalAssetId?: string | null;
  profilePhotoUri?: string | null;
};

export { LOCAL_PET_PROFILE_KEY } from './keys';

export async function loadLocalPetProfile(
  storage: SecureStorage = secureStorage,
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
  storage: SecureStorage = secureStorage,
): Promise<LocalPetProfile> {
  const existingProfile = await loadLocalPetProfile(storage);
  const now = new Date().toISOString();

  const profile: LocalPetProfile = {
    petId: existingProfile?.petId ?? generateLocalPetId(),
    name: existingProfile?.name ?? '',
    type,
    gender: existingProfile?.gender ?? null,
    profilePhotoLocalAssetId: existingProfile?.profilePhotoLocalAssetId ?? null,
    profilePhotoUri: existingProfile?.profilePhotoUri ?? null,
    remotePetId: existingProfile?.remotePetId ?? null,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
  };

  await storage.setItemAsync(LOCAL_PET_PROFILE_KEY, JSON.stringify(profile));

  const database = await getDatabase();
  await rebuildPipelineForProfilePetType(database, type);

  return profile;
}

export async function saveLocalPetProfile(
  input: SaveLocalPetProfileInput,
  storage: SecureStorage = secureStorage,
): Promise<LocalPetProfile> {
  const existingProfile = await loadLocalPetProfile(storage);
  const now = new Date().toISOString();
  const profile: LocalPetProfile = {
    petId: existingProfile?.petId ?? generateLocalPetId(),
    name: input.name.trim(),
    type: input.type,
    gender: input.gender ?? null,
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
    await rebuildPipelineForProfilePetType(database, input.type);
  }

  if (profile.name.trim()) {
    void syncRemotePetProfileIfNeeded();
  }

  return profile;
}

export async function saveLocalPetProfileWithRemoteId(
  profile: LocalPetProfile,
  remotePetId: string,
  storage: SecureStorage = secureStorage,
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
