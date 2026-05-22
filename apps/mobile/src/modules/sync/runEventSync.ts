import type * as SQLite from 'expo-sqlite';

import { logTailo } from '@/lib/tailoLogger';
import {
  clearLocalEventPendingCloudSync,
  getLocalEventById,
} from '@/db/localEvents';
import { releaseEventSyncLock } from '@/db/eventSyncLock';
import { getDoneUploadQueueItemsForEvent } from '@/db/uploadQueue';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';

import { buildSyncEventPayload } from './buildSyncEventPayload';
import { syncEvent } from './syncEvent';

export async function runEventSyncForLocalEvent(
  database: SQLite.SQLiteDatabase,
  localEventId: string,
): Promise<{ status: 'synced' | 'skipped' | 'error'; message?: string }> {
  if (!isRemoteAuthConfigured()) {
    return { status: 'skipped' };
  }

  const session = await getAuthSession();

  if (!session) {
    return { status: 'skipped' };
  }

  const petProfile = await loadLocalPetProfile();

  if (!petProfile?.remotePetId) {
    return { status: 'skipped' };
  }

  const localEvent = await getLocalEventById(database, localEventId);

  if (!localEvent || localEvent.deletedAt) {
    return { status: 'skipped' };
  }

  const uploadedItems = await getDoneUploadQueueItemsForEvent(
    database,
    localEventId,
  );

  const payload = await buildSyncEventPayload(
    database,
    localEvent,
    uploadedItems,
    petProfile.remotePetId,
  );

  if (!payload) {
    return { status: 'skipped' };
  }

  const result = await syncEvent(payload);

  if (result.status === 'error') {
    return { status: 'error', message: result.message };
  }

  await database.runAsync(
    `
      UPDATE local_events
      SET
        remote_event_id = ?,
        server_sync_version = ?,
        pending_ai = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [
      result.response.event_id,
      result.response.server_sync_version,
      result.response.ai_job?.status === 'pending' ? 1 : 0,
      localEventId,
    ],
  );

  await clearLocalEventPendingCloudSync(database, localEventId);
  await releaseEventSyncLock(database, localEventId);

  logTailo('Sync', 'Moment metadata synced to server', {
    localEventId,
    remoteEventId: result.response.event_id,
    serverSyncVersion: result.response.server_sync_version,
    aiJobStatus: result.response.ai_job?.status ?? null,
  });

  return { status: 'synced' };
}
