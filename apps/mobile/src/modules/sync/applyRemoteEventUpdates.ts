import type * as SQLite from 'expo-sqlite';
import {
  isRemoteEventSoftDeleted,
  type RemoteEventUpdate,
} from '@tailo/shared';

import { getLocalEventById, markLocalEventDeleted } from '@/db/localEvents';
import { isLocalEventTombstoned } from '@/db/localEventTombstones';
import { acquireEventSyncLock } from '@/db/eventSyncLock';

import {
  hasMergedEventChanges,
  mergeRemoteEventUpdate,
  type LocalEventSyncSnapshot,
} from './mergeRemoteEventUpdate';
import { shouldApplyRemoteEventUpdate } from './shouldApplyRemoteEventUpdate';
import { hydrateRemoteEventsBySourceLocalEventIds } from './hydratedCloudEvents';

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
    syncLockOwner: local.syncLockOwner,
  };
}

export async function applyRemoteEventUpdates(
  database: SQLite.SQLiteDatabase,
  updates: RemoteEventUpdate[],
): Promise<number> {
  let applied = 0;
  const missingSourceLocalEventIds: string[] = [];

  for (const remote of updates) {
    const local = await getLocalEventById(
      database,
      remote.source_local_event_id,
    );

    if (!local) {
      if (
        !isRemoteEventSoftDeleted(remote) &&
        remote.pet_validation_status !== 'rejected'
      ) {
        missingSourceLocalEventIds.push(remote.source_local_event_id);
      }

      continue;
    }

    const isTombstoned = await isLocalEventTombstoned(
      database,
      remote.source_local_event_id,
    );

    if (isRemoteEventSoftDeleted(remote)) {
      if (isTombstoned || local.deletedAt) {
        continue;
      }

      await markLocalEventDeleted(
        database,
        local.localEventId,
        remote.deleted_at!,
      );
      applied += 1;
      continue;
    }

    if (
      !shouldApplyRemoteEventUpdate({
        isTombstoned,
        local,
        remote,
      })
    ) {
      continue;
    }

    if (remote.pet_validation_status === 'rejected') {
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

    await acquireEventSyncLock(database, local.localEventId, 'ai');

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
          sync_lock_owner = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE local_event_id = ?
          AND (sync_lock_owner IS NULL OR sync_lock_owner = 'ai')
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

  if (missingSourceLocalEventIds.length > 0) {
    const hydrated = await hydrateRemoteEventsBySourceLocalEventIds(
      database,
      missingSourceLocalEventIds,
    );

    if (hydrated.status === 'ok') {
      applied += hydrated.hydratedCount;
    }
  }

  return applied;
}
