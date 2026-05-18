/** Pet profile — MVP supports one pet in UI (Phase 1). */
export { DEFAULT_LOCAL_PET_ID, resolveLocalPetId } from './resolveLocalPetId';
export {
  loadLocalPetProfile,
  LOCAL_PET_PROFILE_KEY,
  saveLocalPetProfile,
  saveSelectedPetType,
  type LocalPetGender,
  type LocalPetProfile,
  type LocalPetType,
  type SaveLocalPetProfileInput,
} from './petProfile';
export {
  useLocalPetProfile,
  type LocalPetProfileState,
} from './useLocalPetProfile';
export {
  isPetCandidateForProfile,
  matchesProfilePetType,
} from './matchesProfilePetType';
