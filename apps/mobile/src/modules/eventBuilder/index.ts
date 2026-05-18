/** Pet detection, clustering, scoring, event candidates (Phase 0). */
export {
  selectBestEventImages,
  type BestImageSelectionProgress,
} from './bestImageSelection';
export {
  buildEventCandidates,
  dedupeNearIdenticalAssets,
  type BuildEventCandidatesOptions,
} from './clustering';
export {
  clusterLocalPetEvents,
  type EventClusteringProgress,
} from './eventClustering';
export {
  processPendingPetCandidates,
  type PetDetectionProgress,
} from './petDetection';
export {
  promoteScoredCandidatesToLocalEvents,
  type PromoteLocalEventsProgress,
} from './eventPromotion';
export {
  redetectLocalPetPipeline,
  type RedetectLocalPetPipelineResult,
} from './redetectPipeline';
export {
  rebuildPipelineForProfilePetType,
  type RebuildPipelineForProfilePetTypeResult,
} from './rebuildPipelineForProfilePetType';
export {
  createFallbackPetDetector,
  createPetDetector,
  detectPetCandidate as detectPetCandidateWithDetector,
  heuristicPetDetector,
  nativePetDetector,
  type PetDetector,
  type PetDetectorInput,
  type PetDetectorResult,
} from './petDetector';
export { detectPetCandidate, type PetDetectionResult } from './petHeuristic';
export {
  scoreEventMedia,
  type ScoreEventMediaOptions,
  type ScoreEventMediaResult,
} from './mediaScoring';
