import { EVENT_TYPES, type EventType } from '../constants/event-types.ts';
import type { PetValidationStatus } from './get-event-updates.ts';

export type BootstrapTimelineMedia = {
  source_local_asset_id: string;
  thumbnail_url: string;
  width: number;
  height: number;
  is_primary: boolean;
  detected_pet_type: 'dog' | 'cat' | null;
  detected_breed: string | null;
};

export type BootstrapTimelineEvent = {
  event_id: string;
  source_local_event_id: string;
  pet_id: string;
  timestamp: string;
  source: 'camera_roll' | 'in_app' | 'manual';
  event_type: EventType;
  caption: string | null;
  caption_source: 'user' | 'ai' | 'placeholder' | null;
  is_favorite: boolean;
  sync_version: number;
  updated_at: string;
  user_edited_caption: boolean;
  user_edited_event_type: boolean;
  pet_validation_status: PetValidationStatus;
  deleted_at: string | null;
  media: BootstrapTimelineMedia[];
};

export type BootstrapTimelineRequest = {
  cursor?: string | null;
  limit?: number;
};

export type BootstrapTimelineResponse = {
  events: BootstrapTimelineEvent[];
  next_cursor: string | null;
};

export function parseBootstrapTimelineRequest(
  body: unknown,
): BootstrapTimelineRequest | null {
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
    (typeof limit !== 'number' || limit < 1 || limit > 30)
  ) {
    return null;
  }

  const parsed: BootstrapTimelineRequest = {};

  if (cursor !== undefined) {
    parsed.cursor = typeof cursor === 'string' ? cursor : null;
  }

  if (typeof limit === 'number') {
    parsed.limit = limit;
  }

  return parsed;
}

function isBootstrapTimelineMedia(
  value: unknown,
): value is BootstrapTimelineMedia {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detectedPetType = Reflect.get(value, 'detected_pet_type');

  return (
    typeof Reflect.get(value, 'source_local_asset_id') === 'string' &&
    typeof Reflect.get(value, 'thumbnail_url') === 'string' &&
    typeof Reflect.get(value, 'width') === 'number' &&
    typeof Reflect.get(value, 'height') === 'number' &&
    typeof Reflect.get(value, 'is_primary') === 'boolean' &&
    (detectedPetType === null ||
      detectedPetType === 'dog' ||
      detectedPetType === 'cat')
  );
}

function isBootstrapTimelineEvent(
  value: unknown,
): value is BootstrapTimelineEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const eventType = Reflect.get(value, 'event_type');
  const source = Reflect.get(value, 'source');
  const media = Reflect.get(value, 'media');
  const deletedAt = Reflect.get(value, 'deleted_at');

  if (!Array.isArray(media) || media.length === 0) {
    return false;
  }

  return (
    typeof Reflect.get(value, 'event_id') === 'string' &&
    typeof Reflect.get(value, 'source_local_event_id') === 'string' &&
    typeof Reflect.get(value, 'pet_id') === 'string' &&
    typeof Reflect.get(value, 'timestamp') === 'string' &&
    (source === 'camera_roll' || source === 'in_app' || source === 'manual') &&
    typeof eventType === 'string' &&
    EVENT_TYPES.includes(eventType as EventType) &&
    typeof Reflect.get(value, 'sync_version') === 'number' &&
    typeof Reflect.get(value, 'updated_at') === 'string' &&
    (deletedAt === null ||
      deletedAt === undefined ||
      typeof deletedAt === 'string') &&
    media.every((item) => isBootstrapTimelineMedia(item))
  );
}

export function isBootstrapTimelineResponse(
  value: unknown,
): value is BootstrapTimelineResponse {
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

  return events.every((event) => isBootstrapTimelineEvent(event));
}
