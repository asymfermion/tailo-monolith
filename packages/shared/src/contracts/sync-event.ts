import { EVENT_TYPES, type EventType } from '../constants/event-types.ts';

export type SyncEventMediaInput = {
  source_local_asset_id: string;
  storage_path: string;
  thumbnail_path: string;
  media_fingerprint?: string | null;
  width: number;
  height: number;
  is_primary: boolean;
  detected_pet_type?: 'dog' | 'cat' | null;
};

export type SyncEventUserEdited = {
  caption?: boolean;
  event_type?: boolean;
};

export type SyncEventRequest = {
  source_local_event_id: string;
  pet_id: string;
  timestamp: string;
  source: 'camera_roll' | 'in_app' | 'manual';
  event_type: EventType;
  caption: string | null;
  caption_source: 'user' | 'placeholder';
  is_favorite: boolean;
  client_sync_version?: number;
  /** Bumped when the user wipes the local timeline (e.g. Redetect pets). */
  client_timeline_generation?: number;
  user_edited?: SyncEventUserEdited;
  media: SyncEventMediaInput[];
};

export type SyncEventAiJobResponse = {
  ai_job_id: string;
  status: 'pending' | 'skipped';
};

export type SyncEventResponse = {
  event_id: string;
  server_sync_version: number;
  ai_job?: SyncEventAiJobResponse;
};

export function parseSyncEventRequest(body: unknown): SyncEventRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sourceLocalEventId = Reflect.get(body, 'source_local_event_id');
  const petId = Reflect.get(body, 'pet_id');
  const timestamp = Reflect.get(body, 'timestamp');
  const source = Reflect.get(body, 'source');
  const eventType = Reflect.get(body, 'event_type');
  const caption = Reflect.get(body, 'caption');
  const captionSource = Reflect.get(body, 'caption_source');
  const isFavorite = Reflect.get(body, 'is_favorite');
  const media = Reflect.get(body, 'media');

  if (typeof sourceLocalEventId !== 'string' || !sourceLocalEventId.trim()) {
    return null;
  }

  if (typeof petId !== 'string' || !petId.trim()) {
    return null;
  }

  if (typeof timestamp !== 'string' || !timestamp.trim()) {
    return null;
  }

  if (source !== 'camera_roll' && source !== 'in_app' && source !== 'manual') {
    return null;
  }

  if (
    typeof eventType !== 'string' ||
    !EVENT_TYPES.includes(eventType as EventType)
  ) {
    return null;
  }

  if (caption !== null && typeof caption !== 'string') {
    return null;
  }

  if (captionSource !== 'user' && captionSource !== 'placeholder') {
    return null;
  }

  if (typeof isFavorite !== 'boolean') {
    return null;
  }

  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }

  const parsedMedia: SyncEventMediaInput[] = [];

  for (const item of media) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const sourceLocalAssetId = Reflect.get(item, 'source_local_asset_id');
    const storagePath = Reflect.get(item, 'storage_path');
    const thumbnailPath = Reflect.get(item, 'thumbnail_path');
    const mediaFingerprint = Reflect.get(item, 'media_fingerprint');
    const width = Reflect.get(item, 'width');
    const height = Reflect.get(item, 'height');
    const isPrimary = Reflect.get(item, 'is_primary');
    const detectedPetType = Reflect.get(item, 'detected_pet_type');

    if (typeof sourceLocalAssetId !== 'string' || !sourceLocalAssetId.trim()) {
      return null;
    }

    if (typeof storagePath !== 'string' || !storagePath.trim()) {
      return null;
    }

    if (typeof thumbnailPath !== 'string' || !thumbnailPath.trim()) {
      return null;
    }

    if (
      mediaFingerprint !== undefined &&
      mediaFingerprint !== null &&
      (typeof mediaFingerprint !== 'string' || !mediaFingerprint.trim())
    ) {
      return null;
    }

    if (typeof width !== 'number' || width <= 0) {
      return null;
    }

    if (typeof height !== 'number' || height <= 0) {
      return null;
    }

    if (typeof isPrimary !== 'boolean') {
      return null;
    }

    if (
      detectedPetType !== undefined &&
      detectedPetType !== null &&
      detectedPetType !== 'dog' &&
      detectedPetType !== 'cat'
    ) {
      return null;
    }

    parsedMedia.push({
      source_local_asset_id: sourceLocalAssetId.trim(),
      storage_path: storagePath.trim(),
      thumbnail_path: thumbnailPath.trim(),
      media_fingerprint:
        typeof mediaFingerprint === 'string' ? mediaFingerprint.trim() : null,
      width,
      height,
      is_primary: isPrimary,
      detected_pet_type:
        detectedPetType === 'dog' || detectedPetType === 'cat'
          ? detectedPetType
          : null,
    });
  }

  const clientSyncVersion = Reflect.get(body, 'client_sync_version');
  const clientTimelineGeneration = Reflect.get(
    body,
    'client_timeline_generation',
  );
  const userEditedRaw = Reflect.get(body, 'user_edited');

  let userEdited: SyncEventUserEdited | undefined;

  if (userEditedRaw && typeof userEditedRaw === 'object') {
    userEdited = {
      caption:
        Reflect.get(userEditedRaw, 'caption') === true ? true : undefined,
      event_type:
        Reflect.get(userEditedRaw, 'event_type') === true ? true : undefined,
    };
  }

  return {
    source_local_event_id: sourceLocalEventId.trim(),
    pet_id: petId.trim(),
    timestamp: timestamp.trim(),
    source,
    event_type: eventType as EventType,
    caption: caption === null ? null : caption.trim(),
    caption_source: captionSource,
    is_favorite: isFavorite,
    client_sync_version:
      typeof clientSyncVersion === 'number' && clientSyncVersion >= 0
        ? clientSyncVersion
        : undefined,
    client_timeline_generation:
      typeof clientTimelineGeneration === 'number' &&
      clientTimelineGeneration >= 0
        ? clientTimelineGeneration
        : undefined,
    user_edited: userEdited,
    media: parsedMedia,
  };
}

export function isSyncEventResponse(
  value: unknown,
): value is SyncEventResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const eventId = Reflect.get(value, 'event_id');
  const serverSyncVersion = Reflect.get(value, 'server_sync_version');

  return (
    typeof eventId === 'string' &&
    typeof serverSyncVersion === 'number' &&
    serverSyncVersion >= 0
  );
}
