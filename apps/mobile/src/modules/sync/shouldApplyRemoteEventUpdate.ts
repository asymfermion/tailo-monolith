import type { RemoteEventUpdate } from '@tailo/shared';

import type { LocalEventRow } from '@/db/localEvents';

export type RemoteEventApplyBlockReason =
  | 'tombstoned'
  | 'user_sync_lock'
  | null;

export function getRemoteEventApplyBlockReason(input: {
  isTombstoned: boolean;
  local: LocalEventRow;
  remote: RemoteEventUpdate;
}): RemoteEventApplyBlockReason {
  if (input.isTombstoned) {
    return 'tombstoned';
  }

  if (input.local.syncLockOwner === 'user') {
    return 'user_sync_lock';
  }

  return null;
}

export function shouldApplyRemoteEventUpdate(input: {
  isTombstoned: boolean;
  local: LocalEventRow;
  remote: RemoteEventUpdate;
}): boolean {
  return getRemoteEventApplyBlockReason(input) === null;
}
