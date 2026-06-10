import { syncRemotePetProfileIfNeeded } from '@/modules/pets/remotePetSync';
import { restoreRemoteAccountDataIfNeeded } from '@/modules/sync/restoreRemoteAccountData';

import { logAuth } from './authLogger';
import { isLinkedRemoteAccount } from './authTypes';
import { getAuthProvider } from './authProviderInstance';
import { ensureCurrentUserIfNeeded } from './ensureCurrentUser';
import { linkLegacyAnonymousUserIfNeeded } from './legacyAnonymousLink';
import {
  pullRemoteAccountProfileIfNeeded,
  seedLocalAccountPrefsToCloudIfEmpty,
} from './remoteAccountProfile';

export type CompleteEmailAccountConnectionResult =
  | { status: 'skipped' }
  | { status: 'completed' }
  | { status: 'partial'; message: string };

/**
 * Runs Tailo-side bootstrap after email link, sign-in, or password reset.
 * Idempotent — safe after every successful connected session.
 */
export async function completeEmailAccountConnection(): Promise<CompleteEmailAccountConnectionResult> {
  logAuth('Email account bootstrap started');

  if (!getAuthProvider().isConfigured()) {
    logAuth('Email account bootstrap skipped (auth not configured)');
    return { status: 'skipped' };
  }

  const ensureResult = await ensureCurrentUserIfNeeded();
  logAuth('Ensure current user finished', { status: ensureResult.status });

  if (ensureResult.status === 'error') {
    logAuth('Email account bootstrap partial (ensure failed)', {
      message: ensureResult.message,
    });
    return { status: 'partial', message: ensureResult.message };
  }

  await linkLegacyAnonymousUserIfNeeded();
  logAuth('Legacy anonymous link step finished');

  const session = await getAuthProvider().getSession();

  if (!isLinkedRemoteAccount(session)) {
    logAuth('Email account bootstrap completed (session not linked yet)');
    return { status: 'completed' };
  }

  const restoreResult = await restoreRemoteAccountDataIfNeeded({
    force: true,
  });
  logAuth('Remote account restore finished', {
    status: restoreResult.status,
    ...(restoreResult.status === 'restored'
      ? {
          eventCount: restoreResult.eventCount,
          accountPulled: restoreResult.accountPulled,
          petPulled: restoreResult.petPulled,
        }
      : {}),
    ...(restoreResult.status === 'error'
      ? { message: restoreResult.message }
      : {}),
  });

  if (restoreResult.status === 'error') {
    return { status: 'partial', message: restoreResult.message };
  }

  if (restoreResult.status === 'skipped') {
    const profilePull = await pullRemoteAccountProfileIfNeeded();
    logAuth('Remote account profile refresh finished', {
      status: profilePull.status,
    });

    if (profilePull.status === 'error') {
      return { status: 'partial', message: profilePull.message };
    }
  }

  const seedResult = await seedLocalAccountPrefsToCloudIfEmpty();
  logAuth('Remote account profile seed finished', {
    status: seedResult.status,
  });

  if (seedResult.status === 'error') {
    return { status: 'partial', message: seedResult.message };
  }

  await syncRemotePetProfileIfNeeded();
  logAuth('Email account bootstrap completed');

  return { status: 'completed' };
}
