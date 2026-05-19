import type { LocalEventSyncSnapshot } from './mergeRemoteEventUpdate';

export function hasRemoteEventChanges(
  local: LocalEventSyncSnapshot,
  merged: LocalEventSyncSnapshot,
): boolean {
  return (
    local.remoteEventId !== merged.remoteEventId ||
    local.eventType !== merged.eventType ||
    (local.caption ?? '') !== (merged.caption ?? '') ||
    local.captionSource !== merged.captionSource ||
    local.isFavorite !== merged.isFavorite ||
    local.serverSyncVersion !== merged.serverSyncVersion ||
    local.pendingAi !== merged.pendingAi
  );
}
