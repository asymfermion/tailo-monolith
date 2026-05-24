import { getDatabase } from '@/db';
import { logTailo } from '@/lib/tailoLogger';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets/remotePetSync';
import { runCloudSyncPass } from '@/modules/sync/runCloudSyncPass';

import { logAuth } from './authLogger';
import { ensureAnonymousCloudAccountIfNeeded } from './anonymousCloudAccount';

/** Ensures cloud account + pet exist before leaving onboarding. */
export async function ensureOnboardingCloudIdentity(): Promise<void> {
  try {
    const accountResult = await ensureAnonymousCloudAccountIfNeeded();
    logAuth('Anonymous cloud account ensure finished after onboarding', {
      status: accountResult.status,
    });

    const petResult = await syncRemotePetProfileIfNeeded();
    logTailo('Sync', 'Remote pet sync finished after onboarding', {
      status: petResult.status,
    });
  } catch (error) {
    logTailo('Sync', 'Onboarding cloud setup failed', {
      message: error instanceof Error ? error.message : 'Unknown sync error.',
    });
  }
}

/** Uploads and syncs moments without blocking navigation to the timeline. */
export function schedulePostOnboardingCloudSync(): void {
  void (async () => {
    try {
      const database = await getDatabase();
      await runCloudSyncPass(database);
    } catch (error) {
      logTailo('Sync', 'Post-onboarding cloud sync failed', {
        message: error instanceof Error ? error.message : 'Unknown error.',
      });
    }
  })();
}
