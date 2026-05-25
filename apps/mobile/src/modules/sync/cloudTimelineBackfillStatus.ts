import type * as SQLite from 'expo-sqlite';

import { getSyncStateValue, SYNC_STATE_KEYS } from '@/db/syncState';

import { getCloudHydratedEventCount } from './hydrateCloudTimeline';

export type CloudTimelineBackfillStatus = {
  hasHydratedTimeline: boolean;
  isBackfillCompleted: boolean;
};

export async function getCloudTimelineBackfillStatus(
  database: SQLite.SQLiteDatabase,
): Promise<CloudTimelineBackfillStatus> {
  const hydratedCount = await getCloudHydratedEventCount(database);

  if (hydratedCount === 0) {
    return {
      hasHydratedTimeline: false,
      isBackfillCompleted: true,
    };
  }

  const completedValue = await getSyncStateValue(
    database,
    SYNC_STATE_KEYS.BOOTSTRAP_BACKFILL_COMPLETED,
  );

  return {
    hasHydratedTimeline: true,
    isBackfillCompleted: completedValue === '1',
  };
}
