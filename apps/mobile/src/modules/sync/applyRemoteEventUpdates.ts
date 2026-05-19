import type * as SQLite from 'expo-sqlite';
import type { RemoteEventUpdate } from '@tailo/shared';

import { getLocalEventById } from '@/db/localEvents';
import { mergeRemoteEventUpdate } from './mergeRemoteEventUpdate';

export async function applyRemoteEventUpdates(
  database: SQLite.SQLiteDatabase,
  updates: RemoteEventUpdate[],
): Promise<number> {
  let applied = 0;

  for (const remote of updates) {
    const local = await getLocalEventById(
      database,
      remote.source_local_event_id,
    );

    if (!local) {
      continue;
    }

    const merged = mergeRemoteEventUpdate(
      {
        localEventId: local.localEventId,
        eventType: local.eventType ?? 'unknown',
        caption: local.caption,
        captionSource: local.captionSource,
        isFavorite: local.isFavorite === 1,
        serverSyncVersion: local.serverSyncVersion,
        userEditedCaption: local.userEditedCaption === 1,
        userEditedEventType: local.userEditedEventType === 1,
        pendingAi: local.pendingAi === 1,
        remoteEventId: local.remoteEventId ?? remote.event_id,
      },
      remote,
    );

    await database.runAsync(
      `
        UPDATE local_events
        SET
          remote_event_id = ?,
          event_type = ?,
          caption = ?,
          caption_source = ?,
          is_favorite = ?,
          server_sync_version = ?,
          user_edited_caption = ?,
          user_edited_event_type = ?,
          pending_ai = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE local_event_id = ?
      `,
      [
        merged.remoteEventId,
        merged.eventType,
        merged.caption,
        merged.captionSource,
        merged.isFavorite ? 1 : 0,
        merged.serverSyncVersion,
        merged.userEditedCaption ? 1 : 0,
        merged.userEditedEventType ? 1 : 0,
        merged.pendingAi ? 1 : 0,
        local.localEventId,
      ],
    );

    applied += 1;
  }

  return applied;
}
