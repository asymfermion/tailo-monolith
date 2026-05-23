/**
 * MVP auth edge-case policy (phase-2-backend-mvp.md).
 * Pure rules for mobile session handling and legacy link conflicts.
 */

export const AUTH_EDGE_SCENARIOS = [
  'fresh_install_anonymous',
  'phase1_legacy_upgrade',
  'app_reinstall_anonymous',
  'session_refresh_hard_failure',
  'link_provider_on_device',
  'link_provider_conflict',
  'second_device_sign_in',
  'logout',
] as const;

export type AuthEdgeScenario = (typeof AUTH_EDGE_SCENARIOS)[number];

export type AuthEdgePolicy = {
  /** Caller should invoke ensure-current-user after a Supabase session exists. */
  requiresEnsureCurrentUser: boolean;
  /** Anonymous users may use cloud sync and AI in MVP. */
  allowAnonymousSyncAndAi: boolean;
  /** New anonymous Supabase subject (reinstall / hard auth failure). */
  createsNewAnonymousSubject: boolean;
  /** Prior anonymous cloud rows stay on the old app_user_id. */
  orphansPriorAnonymousCloudData: boolean;
  /** Permanent link (email / Apple / Google) on this device. */
  upgradesToConnectedAccount: boolean;
  /** Multi-device sign-in / merge is out of scope for MVP. */
  multiDeviceSignInSupported: boolean;
};

const POLICIES: Record<AuthEdgeScenario, AuthEdgePolicy> = {
  fresh_install_anonymous: {
    requiresEnsureCurrentUser: true,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: true,
    orphansPriorAnonymousCloudData: false,
    upgradesToConnectedAccount: false,
    multiDeviceSignInSupported: false,
  },
  phase1_legacy_upgrade: {
    requiresEnsureCurrentUser: true,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: false,
    orphansPriorAnonymousCloudData: false,
    upgradesToConnectedAccount: false,
    multiDeviceSignInSupported: false,
  },
  app_reinstall_anonymous: {
    requiresEnsureCurrentUser: true,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: true,
    orphansPriorAnonymousCloudData: true,
    upgradesToConnectedAccount: false,
    multiDeviceSignInSupported: false,
  },
  session_refresh_hard_failure: {
    requiresEnsureCurrentUser: true,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: true,
    orphansPriorAnonymousCloudData: true,
    upgradesToConnectedAccount: false,
    multiDeviceSignInSupported: false,
  },
  link_provider_on_device: {
    requiresEnsureCurrentUser: true,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: false,
    orphansPriorAnonymousCloudData: false,
    upgradesToConnectedAccount: true,
    multiDeviceSignInSupported: false,
  },
  link_provider_conflict: {
    requiresEnsureCurrentUser: false,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: false,
    orphansPriorAnonymousCloudData: false,
    upgradesToConnectedAccount: false,
    multiDeviceSignInSupported: false,
  },
  second_device_sign_in: {
    requiresEnsureCurrentUser: true,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: false,
    orphansPriorAnonymousCloudData: false,
    upgradesToConnectedAccount: true,
    multiDeviceSignInSupported: false,
  },
  logout: {
    requiresEnsureCurrentUser: false,
    allowAnonymousSyncAndAi: true,
    createsNewAnonymousSubject: true,
    orphansPriorAnonymousCloudData: false,
    upgradesToConnectedAccount: false,
    multiDeviceSignInSupported: false,
  },
};

export function resolveAuthEdgePolicy(
  scenario: AuthEdgeScenario,
): AuthEdgePolicy {
  return POLICIES[scenario];
}

/** MVP: never gate sync/AI on anonymous vs connected. */
export function shouldAllowAnonymousCloudFeatures(): boolean {
  return true;
}

export type LegacyLinkAttempt =
  | 'create'
  | 'idempotent'
  | 'conflict'
  | 'invalid_legacy_id';

export function classifyLegacyLinkAttempt(input: {
  legacyAnonymousUserId: string;
  callerUserId: string;
  existingUserId: string | null;
}): LegacyLinkAttempt {
  const legacyId = input.legacyAnonymousUserId.trim();

  if (!legacyId.startsWith('anon_')) {
    return 'invalid_legacy_id';
  }

  if (!input.existingUserId) {
    return 'create';
  }

  if (input.existingUserId === input.callerUserId) {
    return 'idempotent';
  }

  return 'conflict';
}

export function shouldBootstrapAnonymousAfterLogout(): boolean {
  return true;
}

export function shouldRequireLoginGateAfterLogout(): boolean {
  return true;
}
