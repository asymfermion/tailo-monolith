import { describe, expect, it } from 'vitest';

import {
  AUTH_EDGE_SCENARIOS,
  classifyLegacyLinkAttempt,
  resolveAuthEdgePolicy,
  shouldAllowAnonymousCloudFeatures,
  shouldBootstrapAnonymousAfterLogout,
  shouldRequireLoginGateAfterLogout,
} from './authEdgeCasePolicy';

describe('resolveAuthEdgePolicy', () => {
  it.each(AUTH_EDGE_SCENARIOS)('defines policy for %s', (scenario) => {
    const policy = resolveAuthEdgePolicy(scenario);

    expect(typeof policy.requiresEnsureCurrentUser).toBe('boolean');
    expect(policy.allowAnonymousSyncAndAi).toBe(true);
  });

  it('orphans cloud data on reinstall and hard session failure', () => {
    expect(
      resolveAuthEdgePolicy('app_reinstall_anonymous')
        .orphansPriorAnonymousCloudData,
    ).toBe(true);
    expect(
      resolveAuthEdgePolicy('session_refresh_hard_failure')
        .orphansPriorAnonymousCloudData,
    ).toBe(true);
  });

  it('marks provider link as connected upgrade', () => {
    expect(
      resolveAuthEdgePolicy('link_provider_on_device')
        .upgradesToConnectedAccount,
    ).toBe(true);
  });

  it('defers multi-device sign-in', () => {
    expect(
      resolveAuthEdgePolicy('second_device_sign_in').multiDeviceSignInSupported,
    ).toBe(false);
  });
});

describe('classifyLegacyLinkAttempt', () => {
  it('requires anon_ prefix', () => {
    expect(
      classifyLegacyLinkAttempt({
        legacyAnonymousUserId: 'bad_id',
        callerUserId: 'user-a',
        existingUserId: null,
      }),
    ).toBe('invalid_legacy_id');
  });

  it('creates when no existing mapping', () => {
    expect(
      classifyLegacyLinkAttempt({
        legacyAnonymousUserId: 'anon_123',
        callerUserId: 'user-a',
        existingUserId: null,
      }),
    ).toBe('create');
  });

  it('is idempotent for same user', () => {
    expect(
      classifyLegacyLinkAttempt({
        legacyAnonymousUserId: 'anon_123',
        callerUserId: 'user-a',
        existingUserId: 'user-a',
      }),
    ).toBe('idempotent');
  });

  it('conflicts when mapped to another user', () => {
    expect(
      classifyLegacyLinkAttempt({
        legacyAnonymousUserId: 'anon_123',
        callerUserId: 'user-b',
        existingUserId: 'user-a',
      }),
    ).toBe('conflict');
  });
});

describe('MVP helpers', () => {
  it('allows anonymous cloud features', () => {
    expect(shouldAllowAnonymousCloudFeatures()).toBe(true);
  });

  it('requires login gate after logout', () => {
    expect(shouldRequireLoginGateAfterLogout()).toBe(true);
    expect(shouldBootstrapAnonymousAfterLogout()).toBe(true);
  });
});
