import type { RemoteEventUpdate } from '@tailo/shared';
import { resolveDisplayCaption } from '@tailo/ai';

import type { CaptionSource } from '@/db/localEvents';

export type LocalEventSyncSnapshot = {
  localEventId: string;
  eventType: RemoteEventUpdate['event_type'];
  caption: string | null;
  captionSource: CaptionSource | null;
  isFavorite: boolean;
  serverSyncVersion: number;
  userEditedCaption: boolean;
  userEditedEventType: boolean;
  pendingAi: boolean;
  remoteEventId: string;
};

export function mergeRemoteEventUpdate(
  local: LocalEventSyncSnapshot,
  remote: RemoteEventUpdate,
): LocalEventSyncSnapshot {
  const nextCaption = local.userEditedCaption
    ? local.caption
    : remote.caption !== null
      ? resolveDisplayCaption(
          remote.caption,
          remote.caption_source,
          remote.source_local_event_id,
        )
      : local.caption;

  const nextEventType = local.userEditedEventType
    ? local.eventType
    : remote.event_type;

  const nextFavorite =
    remote.sync_version >= local.serverSyncVersion
      ? remote.is_favorite
      : local.isFavorite;

  const pendingAi =
    remote.ai_job_status === 'pending' || remote.ai_job_status === 'processing';

  return {
    ...local,
    remoteEventId: remote.event_id,
    eventType: nextEventType,
    caption: nextCaption,
    captionSource: remote.caption_source ?? local.captionSource,
    isFavorite: nextFavorite,
    serverSyncVersion: Math.max(local.serverSyncVersion, remote.sync_version),
    pendingAi,
  };
}
