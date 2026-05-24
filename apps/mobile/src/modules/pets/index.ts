/** Pet profile — MVP supports one pet in UI (Phase 1). */
export { DEFAULT_LOCAL_PET_ID, resolveLocalPetId } from './resolveLocalPetId';
export {
  hasReadyLocalPetProfile,
  isLocalPetProfileReady,
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
  PetProfileEditor,
  canSavePetProfileDraft,
} from './components/PetProfileEditor';
export {
  isPetCandidateForProfile,
  matchesProfilePetType,
} from './matchesProfilePetType';
export {
  syncRemotePetProfileIfNeeded,
  type SyncRemotePetProfileResult,
} from './remotePetSync';
export {
  pullRemotePetProfileIfNeeded,
  type PullRemotePetProfileResult,
} from './pullRemotePetProfile';
