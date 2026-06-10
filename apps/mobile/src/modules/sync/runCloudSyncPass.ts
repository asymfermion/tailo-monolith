import type * as SQLite from 'expo-sqlite';

import { logTailo } from '@/lib/tailoLogger';
import { runNotificationSyncPass } from '@/modules/notifications';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets';

import { pollEventUpdates } from './pollEventUpdates';
import { runPendingCloudSync } from './runPendingCloudSync';
import { runUploadQueueWorker } from './uploadQueueWorker';

export type RunCloudSyncPassResult = {
  petSyncStatus: string;
  upload: Awaited<ReturnType<typeof runUploadQueueWorker>>;
  pendingEdits: Awaited<ReturnType<typeof runPendingCloudSync>>;
  notifications: Awaited<ReturnType<typeof runNotificationSyncPass>>;
};

/**
 * Drains queued media uploads and syncs local moments after pet profile is ready.
 * Call after onboarding, pet save, or when the app returns to the foreground.
 */
export async function runCloudSyncPass(
  database: SQLite.SQLiteDatabase,
): Promise<RunCloudSyncPassResult> {
  logTailo('Sync', 'Cloud sync pass started');

  const petResult = await syncRemotePetProfileIfNeeded();
  logTailo('Sync', 'Remote pet sync finished', { status: petResult.status });

  const upload = await runUploadQueueWorker();
  const pendingEdits = await runPendingCloudSync(database);
  await pollEventUpdates(database);
  const notifications = await runNotificationSyncPass(database);

  logTailo('Sync', 'Cloud sync pass finished', {
    petSyncStatus: petResult.status,
    uploadedAssets: upload.uploadedAssets,
    uploadSkippedReason: upload.skippedReason,
    pendingEditsSynced: pendingEdits.synced,
    notificationsPushed: notifications.pushed,
    notificationsPulled: notifications.pulled,
  });

  return {
    petSyncStatus: petResult.status,
    upload,
    pendingEdits,
    notifications,
  };
}
