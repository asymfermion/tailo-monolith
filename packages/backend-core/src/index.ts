export {
  AUTH_EDGE_SCENARIOS,
  classifyLegacyLinkAttempt,
  resolveAuthEdgePolicy,
  shouldAllowAnonymousCloudFeatures,
  shouldBootstrapAnonymousAfterLogout,
  shouldRequireLoginGateAfterLogout,
  type AuthEdgePolicy,
  type AuthEdgeScenario,
  type LegacyLinkAttempt,
} from './usecases/authEdgeCasePolicy';
export {
  resolveLinkAnonymousUser,
  type AnonymousIdLinkRow,
  type LinkAnonymousUserInput,
  type LinkAnonymousUserResult,
} from './usecases/linkAnonymousUser';
export {
  buildEnsureAppUserRpcParams,
  mapEnsureCurrentUserRow,
  normalizeIdentityEmail,
  shouldEnsureEmailIdentity,
  type EnsureCurrentUserInput,
  type EnsureCurrentUserResult,
  type EnsureCurrentUserRpcRow,
} from './usecases/ensureCurrentUser';
export {
  resolveUpsertAccountProfile,
  SUPPORTED_ACCOUNT_LOCALES,
  type AccountProfileRow,
  type UpsertAccountProfileInput,
  type UpsertAccountProfileResult,
} from './usecases/upsertAccountProfile';
export {
  mergeSyncEventPayload,
  type ExistingEventRow,
  type SyncEventMergeInput,
  type SyncEventMergeResult,
} from './usecases/syncEventMerge';
export {
  applyAiResultToEvent,
  type AppliedAiResult,
  type EventAiTarget,
} from './usecases/applyAiResultToEvent';
export {
  decodeEventUpdateCursor,
  encodeEventUpdateCursor,
  type EventUpdateCursor,
} from './usecases/eventUpdateCursor';
export {
  validateUploadRequest,
  type UploadRequestAsset,
  type ValidateUploadRequestInput,
  type ValidateUploadRequestResult,
} from './usecases/validateUploadRequest';
export {
  resolveUpsertPetProfile,
  type PetProfileRow,
  type UpsertPetProfileInput,
  type UpsertPetProfileResult,
} from './usecases/upsertPetProfile';
export {
  AI_JOB_LEASE_SECONDS,
  SWEEP_MAX_JOBS_CAP,
  SWEEP_MAX_JOBS_DEFAULT,
  parseProcessAiJobInvokeRequest,
  shouldReleaseAiJobLease,
  type ProcessAiJobInvokeRequest,
} from './usecases/aiJobLease';
export {
  AI_JOB_MAX_ATTEMPTS,
  AI_JOB_BACKOFF_MINUTES,
  getAiJobBackoffIso,
  isAiJobDue,
  resolveAiJobFailure,
  type AiJobFailureResolution,
} from './usecases/aiJobFailure';
