import { loadLocalPetProfile } from './petProfile';

export const DEFAULT_LOCAL_PET_ID = 'local_pet_default';

export async function resolveLocalPetId(): Promise<string> {
  const profile = await loadLocalPetProfile();
  return profile?.petId ?? DEFAULT_LOCAL_PET_ID;
}
