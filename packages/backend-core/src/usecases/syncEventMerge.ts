import type { SyncEventRequest } from '@tailo/shared';

export type ExistingEventRow = {
  eventId: string;
  userId: string;
  petId: string;
  sourceLocalEventId: string;
  timestamp: string;
  source: SyncEventRequest['source'];
  eventType: SyncEventRequest['event_type'];
  caption: string | null;
  captionSource: 'user' | 'ai' | 'placeholder' | null;
  isFavorite: boolean;
  userEditedCaption: boolean;
  userEditedEventType: boolean;
  syncVersion: number;
};

export type SyncEventMergeInput = {
  callerUserId: string;
  request: SyncEventRequest;
  existing: ExistingEventRow | null;
};

export type SyncEventMergeResult = {
  eventId: string;
  petId: string;
  timestamp: string;
  source: SyncEventRequest['source'];
  eventType: SyncEventRequest['event_type'];
  caption: string | null;
  captionSource: 'user' | 'ai' | 'placeholder';
  isFavorite: boolean;
  userEditedCaption: boolean;
  userEditedEventType: boolean;
  nextSyncVersion: number;
  shouldCreateAiJob: boolean;
  primaryAssetId: string | null;
};

export function mergeSyncEventPayload(
  input: SyncEventMergeInput,
): SyncEventMergeResult | { ok: false; code: 'forbidden'; message: string } {
  const { request, existing } = input;

  if (existing && existing.userId !== input.callerUserId) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Event belongs to another account.',
    };
  }

  if (existing && existing.petId !== request.pet_id) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Event already exists for a different pet.',
    };
  }

  const eventId = existing?.eventId ?? crypto.randomUUID();
  const userEditedCaption =
    existing?.userEditedCaption ||
    request.user_edited?.caption === true ||
    request.caption_source === 'user';
  const userEditedEventType =
    existing?.userEditedEventType || request.user_edited?.event_type === true;

  const caption = userEditedCaption
    ? request.caption
    : existing?.userEditedCaption
      ? existing.caption
      : request.caption;

  const captionSource: 'user' | 'ai' | 'placeholder' =
    request.caption_source === 'user' || userEditedCaption
      ? 'user'
      : existing?.captionSource === 'ai'
        ? 'ai'
        : request.caption_source;

  const eventType = userEditedEventType
    ? request.event_type
    : existing?.userEditedEventType
      ? existing.eventType
      : request.event_type;

  const clientVersion = request.client_sync_version ?? 0;
  const serverVersion = existing?.syncVersion ?? 0;
  const isFavorite =
    clientVersion >= serverVersion
      ? request.is_favorite
      : (existing?.isFavorite ?? request.is_favorite);

  const primaryAsset =
    request.media.find((item) => item.is_primary) ?? request.media[0] ?? null;

  const shouldCreateAiJob =
    request.media.length > 0 &&
    captionSource !== 'user' &&
    primaryAsset !== null;

  return {
    eventId,
    petId: request.pet_id,
    timestamp: existing?.timestamp ?? request.timestamp,
    source: existing?.source ?? request.source,
    eventType,
    caption,
    captionSource,
    isFavorite,
    userEditedCaption,
    userEditedEventType,
    nextSyncVersion: serverVersion + 1,
    shouldCreateAiJob,
    primaryAssetId: primaryAsset?.source_local_asset_id ?? null,
  };
}
