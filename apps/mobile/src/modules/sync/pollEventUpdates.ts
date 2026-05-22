import type * as SQLite from 'expo-sqlite';

import {
  getSyncStateValue,
  setSyncStateValue,
  SYNC_STATE_KEYS,
} from '@/db/syncState';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';

import { applyRemoteEventUpdates } from './applyRemoteEventUpdates';
import { getEventUpdates } from './getEventUpdates';

const EVENTS_CURSOR_KEY = SYNC_STATE_KEYS.EVENTS_CURSOR;

export async function hasPendingAiEvents(
  database: SQLite.SQLiteDatabase,
): Promise<boolean> {
  const row = await database.getFirstAsync<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM local_events
    WHERE pending_ai = 1
      AND deleted_at IS NULL
  `);

  return (row?.count ?? 0) > 0;
}

export async function pollEventUpdates(
  database: SQLite.SQLiteDatabase,
): Promise<{ applied: number; skippedReason: string | null }> {
  if (!isRemoteAuthConfigured()) {
    return { applied: 0, skippedReason: 'remote_auth_unconfigured' };
  }

  const session = await getAuthSession();

  if (!session) {
    return { applied: 0, skippedReason: 'missing_session' };
  }

  const cursor = await getSyncStateValue(database, EVENTS_CURSOR_KEY);
  const result = await getEventUpdates({ cursor });

  if (result.status === 'error') {
    return { applied: 0, skippedReason: result.message };
  }

  const applied = await applyRemoteEventUpdates(
    database,
    result.response.events,
  );

  if (result.response.next_cursor) {
    await setSyncStateValue(
      database,
      EVENTS_CURSOR_KEY,
      result.response.next_cursor,
    );
  }

  return { applied, skippedReason: null };
}
