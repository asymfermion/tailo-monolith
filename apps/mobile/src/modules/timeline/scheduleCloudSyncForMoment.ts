import { getDatabase } from '@/db';

import { runPendingCloudSyncForEvent } from '@/modules/sync/runPendingCloudSync';

/** Push local moment edits to the server when auth and uploads allow. */
export function scheduleCloudSyncForMoment(localEventId: string): void {
  void getDatabase()
    .then((database) => runPendingCloudSyncForEvent(database, localEventId))
    .catch(() => undefined);
}
