import { saveLocalAccountProfile } from './localAccountProfile';
import {
  syncRemoteAccountProfile,
  type SyncRemoteAccountProfilePatch,
  type SyncRemoteAccountProfileResult,
} from './remoteAccountProfile';

export type SaveAccountProfilePatch = SyncRemoteAccountProfilePatch;

export type SaveAccountProfileResult =
  | { status: 'saved_local' }
  | Extract<SyncRemoteAccountProfileResult, { status: 'synced' }>
  | { status: 'error'; message: string; localSaved: boolean }
  | Extract<
      SyncRemoteAccountProfileResult,
      { status: 'not_linked' } | { status: 'skipped' }
    >;

export async function saveAccountProfile(
  patch: SaveAccountProfilePatch,
): Promise<SaveAccountProfileResult> {
  let localSaved = false;

  if ('displayName' in patch) {
    await saveLocalAccountProfile({
      displayName: patch.displayName ?? null,
    });
    localSaved = true;
  }

  const syncResult = await syncRemoteAccountProfile(patch);

  if (syncResult.status === 'synced') {
    await saveLocalAccountProfile({
      displayName: syncResult.response.display_name ?? null,
    });

    return syncResult;
  }

  if (syncResult.status === 'error') {
    return {
      status: 'error',
      message: syncResult.message,
      localSaved,
    };
  }

  if (localSaved) {
    return { status: 'saved_local' };
  }

  return syncResult;
}
