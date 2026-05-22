import { EVENT_TYPES, type EventType } from '../constants/event-types.ts';

export type RemoteAiJobStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'failed'
  | 'skipped'
  | null;

export type PetValidationStatus = 'pending' | 'valid' | 'rejected';

export type RemoteEventUpdate = {
  event_id: string;
  source_local_event_id: string;
  event_type: EventType;
  caption: string | null;
  caption_source: 'user' | 'ai' | 'placeholder' | null;
  is_favorite: boolean;
  sync_version: number;
  updated_at: string;
  user_edited_caption: boolean;
  user_edited_event_type: boolean;
  ai_job_status: RemoteAiJobStatus;
  pet_validation_status: PetValidationStatus;
  /** ISO timestamp when the event was soft-deleted (cloud reject or future user delete). */
  deleted_at: string | null;
};

export function isRemoteEventSoftDeleted(remote: RemoteEventUpdate): boolean {
  return remote.deleted_at !== null;
}

export type GetEventUpdatesRequest = {
  cursor?: string | null;
  limit?: number;
};

export type GetEventUpdatesResponse = {
  events: RemoteEventUpdate[];
  next_cursor: string | null;
};

export function parseGetEventUpdatesRequest(
  body: unknown,
): GetEventUpdatesRequest | null {
  if (body === null || body === undefined) {
    return {};
  }

  if (typeof body !== 'object') {
    return null;
  }

  const cursor = Reflect.get(body, 'cursor');
  const limit = Reflect.get(body, 'limit');

  if (cursor !== undefined && cursor !== null && typeof cursor !== 'string') {
    return null;
  }

  if (
    limit !== undefined &&
    (typeof limit !== 'number' || limit < 1 || limit > 50)
  ) {
    return null;
  }

  return {
    cursor: typeof cursor === 'string' ? cursor : null,
    limit: typeof limit === 'number' ? limit : undefined,
  };
}

export function isGetEventUpdatesResponse(
  value: unknown,
): value is GetEventUpdatesResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const events = Reflect.get(value, 'events');
  const nextCursor = Reflect.get(value, 'next_cursor');

  if (!Array.isArray(events)) {
    return false;
  }

  if (nextCursor !== null && typeof nextCursor !== 'string') {
    return false;
  }

  return events.every((event) => {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const eventType = Reflect.get(event, 'event_type');

    const deletedAt = Reflect.get(event, 'deleted_at');

    return (
      typeof Reflect.get(event, 'event_id') === 'string' &&
      typeof Reflect.get(event, 'source_local_event_id') === 'string' &&
      typeof eventType === 'string' &&
      EVENT_TYPES.includes(eventType as EventType) &&
      typeof Reflect.get(event, 'sync_version') === 'number' &&
      (deletedAt === null ||
        deletedAt === undefined ||
        typeof deletedAt === 'string')
    );
  });
}
