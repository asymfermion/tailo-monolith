import { getDatabase } from '@/db';
import { setSyncStateValue, SYNC_STATE_KEYS } from '@/db/syncState';
import { logAuth } from '@/modules/auth/authLogger';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authSessionAccess';
import { isLinkedRemoteAccount } from '@/modules/auth/authTypes';
import { pullRemoteAccountProfileIfNeeded } from '@/modules/auth/remoteAccountProfile';
import { logTailo } from '@/lib/tailoLogger';
import {
  hasReadyLocalPetProfile,
  loadLocalPetProfile,
} from '@/modules/pets/petProfile';
import { pullRemotePetProfileIfNeeded } from '@/modules/pets/pullRemotePetProfile';
import { saveLocalPetProfileWithRemoteId } from '@/modules/pets/petProfile';

import {
  getCloudHydratedEventCount,
  hydrateCloudTimelineIfNeeded,
  countLocalProcessedTimelineEvents,
} from './hydrateCloudTimeline';
import { repairHydratedTimelineData } from './repairHydratedTimelineData';

export type RestoreRemoteAccountDataResult =
  | { status: 'skipped' }
  | {
      status: 'restored';
      accountPulled: boolean;
      petPulled: boolean;
      eventCount: number;
    }
  | { status: 'partial'; message: string; eventCount: number }
  | { status: 'error'; message: string };

export type RestoreRemoteAccountDataOptions = {
  /** When true, pull pet/timeline even if some local rows exist (e.g. after sign-in). */
  force?: boolean;
};

/**
 * Restores account profile, pet profile, and timeline snapshots from the server
 * for a linked account on a device that has not hydrated cloud data yet
 * (typical cross-device sign-in).
 */
export async function restoreRemoteAccountDataIfNeeded(
  options: RestoreRemoteAccountDataOptions = {},
): Promise<RestoreRemoteAccountDataResult> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!isLinkedRemoteAccount(session)) {
    return { status: 'skipped' };
  }

  const database = await getDatabase();
  const hydratedEventCount = await getCloudHydratedEventCount(database);
  const hasLocalPet = await hasReadyLocalPetProfile();

  if (!options.force && hydratedEventCount > 0 && hasLocalPet) {
    logAuth('Remote account restore skipped — device already has cloud data');
    return { status: 'skipped' };
  }

  logAuth('Remote account restore started', {
    force: Boolean(options.force),
    hydratedEventCount,
    hasLocalPet,
  });

  let accountPulled = false;
  const accountResult = await pullRemoteAccountProfileIfNeeded();

  if (accountResult.status === 'pulled') {
    accountPulled = true;
  }

  if (accountResult.status === 'error') {
    return { status: 'error', message: accountResult.message };
  }

  logAuth('Remote account profile pull finished', {
    status: accountResult.status,
  });

  let petPulled = false;

  if (!hasLocalPet || options.force) {
    const petResult = await pullRemotePetProfileIfNeeded({
      force: options.force,
    });

    if (petResult.status === 'pulled') {
      petPulled = true;
    }

    if (petResult.status === 'error') {
      return { status: 'error', message: petResult.message };
    }
  }

  const profileAfterPet = await hasReadyLocalPetProfile();

  if (!profileAfterPet) {
    logAuth('Remote account restore finished — no pet to hydrate timeline');
    return { status: 'restored', accountPulled, petPulled, eventCount: 0 };
  }

  const petProfile = await loadLocalPetProfile();

  if (!petProfile) {
    return {
      status: 'error',
      message: 'Pet profile missing after cloud pull.',
    };
  }

  if (!options.force && (await getCloudHydratedEventCount(database)) > 0) {
    return {
      status: 'restored',
      accountPulled,
      petPulled,
      eventCount: hydratedEventCount,
    };
  }

  const localProcessedCount = await countLocalProcessedTimelineEvents(database);

  if (options.force && localProcessedCount > 0) {
    logAuth(
      'Remote timeline hydrate skipped — device already has local moments',
      { localProcessedCount },
    );
    await repairHydratedTimelineData(database);

    return {
      status: 'restored',
      accountPulled,
      petPulled,
      eventCount: localProcessedCount,
    };
  }

  const timelineResult = await hydrateCloudTimelineIfNeeded(
    database,
    petProfile.petId,
    { force: options.force },
  );

  if (timelineResult.status === 'error') {
    return { status: 'error', message: timelineResult.message };
  }

  await repairHydratedTimelineData(database);

  const eventCount =
    timelineResult.status === 'hydrated'
      ? timelineResult.eventCount
      : await getCloudHydratedEventCount(database);

  if (timelineResult.status === 'already_hydrated' && eventCount === 0) {
    logTailo('Sync', 'Remote account restore: no cloud moments to show');
  }

  if (profileAfterPet && eventCount > 0) {
    const profile = await loadLocalPetProfile();

    if (profile?.type) {
      await setSyncStateValue(
        database,
        SYNC_STATE_KEYS.PROFILE_PET_FILTER_APPLIED,
        profile.type,
      );
    }

    await hydratePetProfilePhotoUriFromLocalAssets(database);
  }

  logAuth('Remote account restore finished', {
    accountPulled,
    petPulled,
    eventCount,
    timelineStatus: timelineResult.status,
  });

  return { status: 'restored', accountPulled, petPulled, eventCount };
}

async function hydratePetProfilePhotoUriFromLocalAssets(
  database: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  const profile = await loadLocalPetProfile();

  if (
    !profile ||
    !profile.profilePhotoLocalAssetId ||
    profile.profilePhotoUri ||
    !profile.remotePetId
  ) {
    return;
  }

  const row = await database.getFirstAsync<{ uri: string }>(
    `
      SELECT uri
      FROM local_assets
      WHERE local_asset_id = ?
      LIMIT 1
    `,
    [profile.profilePhotoLocalAssetId],
  );

  if (!row?.uri) {
    return;
  }

  await saveLocalPetProfileWithRemoteId(
    {
      ...profile,
      profilePhotoUri: row.uri,
      updatedAt: new Date().toISOString(),
    },
    profile.remotePetId,
  );
}
