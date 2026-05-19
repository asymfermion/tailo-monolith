import type * as SQLite from 'expo-sqlite';
import type { RemoteEventUpdate } from '@tailo/shared';

import { deletePromotedLocalEvent, getLocalEventById } from '@/db/localEvents';
import {
  hasMergedEventChanges,
  mergeRemoteEventUpdate,
  type LocalEventSyncSnapshot,
} from './mergeRemoteEventUpdate';

function toSyncSnapshot(
  local: NonNullable<Awaited<ReturnType<typeof getLocalEventById>>>,
): LocalEventSyncSnapshot {
  return {
    localEventId: local.localEventId,
    eventType: local.eventType ?? 'unknown',
    caption: local.caption,
    captionSource: local.captionSource,
    isFavorite: local.isFavorite === 1,
    serverSyncVersion: local.serverSyncVersion,
    userEditedCaption: local.userEditedCaption === 1,
    userEditedEventType: local.userEditedEventType === 1,
    pendingAi: local.pendingAi === 1,
    remoteEventId: local.remoteEventId ?? '',
  };
}

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

    if (remote.pet_validation_status === 'rejected') {
      await deletePromotedLocalEvent(database, local.localEventId);
      applied += 1;
      continue;
    }

    const before = toSyncSnapshot(local);
    const merged = mergeRemoteEventUpdate(
      {
        ...before,
        remoteEventId: local.remoteEventId ?? remote.event_id,
      },
      remote,
    );

    if (!hasMergedEventChanges(before, merged)) {
      continue;
    }

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
