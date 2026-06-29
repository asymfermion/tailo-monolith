import { MEDIA_READ_SIGNED_URL_TTL_SECONDS } from '../../../../packages/shared/src/constants/media-read.ts';
import {
  decodeBootstrapTimelineCursor,
  encodeBootstrapTimelineCursor,
} from '../../../../packages/backend-core/src/usecases/bootstrapTimelineCursor.ts';
import {
  isBootstrapTimelineResponse,
  parseBootstrapTimelineRequest,
  type BootstrapTimelineEvent,
  type BootstrapTimelineMedia,
  type BootstrapTimelineResponse,
} from '../../../../packages/shared/src/contracts/bootstrap-timeline.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

const DEFAULT_LIMIT = 20;

type EventRow = {
  event_id: string;
  source_local_event_id: string;
  pet_id: string;
  timestamp: string;
  source: BootstrapTimelineEvent['source'];
  event_type: BootstrapTimelineEvent['event_type'];
  caption: string | null;
  caption_source: BootstrapTimelineEvent['caption_source'];
  is_favorite: boolean;
  sync_version: number;
  updated_at: string;
  user_edited_caption: boolean;
  user_edited_event_type: boolean;
  pet_validation_status: BootstrapTimelineEvent['pet_validation_status'];
  deleted_at: string | null;
};

type MediaRow = {
  event_id: string;
  source_local_asset_id: string;
  thumbnail_path: string;
  width: number;
  height: number;
  is_primary: boolean;
  detected_pet_type: 'dog' | 'cat' | null;
  detected_breed: string | null;
};

export const handleBootstrapTimeline: ApiHandler = async ({
  user,
  log,
  payload,
}) => {
  const body = parseBootstrapTimelineRequest(payload ?? {});

  if (body === null) {
    return jsonResponse({ error: 'Invalid request body' }, 422);
  }

  const limit = body.limit ?? DEFAULT_LIMIT;
  const cursor = decodeBootstrapTimelineCursor(body.cursor);
  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  log.info('bootstrap_timeline_request', {
    appUserId: appUser.appUserId,
    hasCursor: Boolean(body.cursor),
    limit,
  });

  let query = adminClient
    .from('events')
    .select(
      'event_id, source_local_event_id, pet_id, timestamp, source, event_type, caption, caption_source, is_favorite, sync_version, updated_at, user_edited_caption, user_edited_event_type, pet_validation_status, deleted_at',
    )
    .eq('app_user_id', appUser.appUserId)
    .is('deleted_at', null)
    .neq('pet_validation_status', 'rejected')
    .order('timestamp', { ascending: false })
    .order('event_id', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.or(
      `timestamp.lt.${cursor.timestamp},and(timestamp.eq.${cursor.timestamp},event_id.lt.${cursor.eventId})`,
    );
  }

  const { data: eventRows, error: eventsError } = await query;

  if (eventsError) {
    return jsonResponse({ error: eventsError.message }, 500);
  }

  const rows = (eventRows ?? []) as EventRow[];

  if (rows.length === 0) {
    return jsonResponse({
      events: [],
      next_cursor: null,
    } satisfies BootstrapTimelineResponse);
  }

  const eventIds = rows.map((row) => row.event_id);
  const { data: mediaRows, error: mediaError } = await adminClient
    .from('event_media')
    .select(
      'event_id, source_local_asset_id, thumbnail_path, width, height, is_primary, detected_pet_type, detected_breed',
    )
    .in('event_id', eventIds);

  if (mediaError) {
    return jsonResponse({ error: mediaError.message }, 500);
  }

  const typedMediaRows = (mediaRows ?? []) as MediaRow[];

  // Sign all thumbnail URLs in one batch call instead of serially per item.
  const allThumbnailPaths = typedMediaRows.map((m) => m.thumbnail_path);
  const signedUrlByPath = new Map<string, string>();

  if (allThumbnailPaths.length > 0) {
    const { data: signedUrls } = await adminClient.storage
      .from('event-media')
      .createSignedUrls(allThumbnailPaths, MEDIA_READ_SIGNED_URL_TTL_SECONDS);

    for (const item of signedUrls ?? []) {
      if (item.signedUrl) {
        signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  const mediaByEvent = new Map<string, MediaRow[]>();

  for (const media of typedMediaRows) {
    const bucket = mediaByEvent.get(media.event_id) ?? [];
    bucket.push(media);
    mediaByEvent.set(media.event_id, bucket);
  }

  const events: BootstrapTimelineEvent[] = [];

  for (const row of rows) {
    const mediaForEvent = mediaByEvent.get(row.event_id) ?? [];
    const media: BootstrapTimelineMedia[] = [];

    for (const item of mediaForEvent) {
      const thumbnailUrl = signedUrlByPath.get(item.thumbnail_path) ?? null;

      if (!thumbnailUrl) {
        continue;
      }

      media.push({
        source_local_asset_id: item.source_local_asset_id,
        thumbnail_url: thumbnailUrl,
        width: item.width,
        height: item.height,
        is_primary: item.is_primary,
        detected_pet_type: item.detected_pet_type,
        detected_breed: item.detected_breed,
      });
    }

    if (media.length === 0) {
      continue;
    }

    events.push({
      event_id: row.event_id,
      source_local_event_id: row.source_local_event_id,
      pet_id: row.pet_id,
      timestamp: row.timestamp,
      source: row.source,
      event_type: row.event_type,
      caption: row.caption,
      caption_source: row.caption_source,
      is_favorite: row.is_favorite,
      sync_version: row.sync_version,
      updated_at: row.updated_at,
      user_edited_caption: row.user_edited_caption,
      user_edited_event_type: row.user_edited_event_type,
      pet_validation_status: row.pet_validation_status ?? 'pending',
      deleted_at: row.deleted_at,
      media,
    });
  }

  const last = rows.at(-1);
  const nextCursor =
    rows.length === limit && last
      ? encodeBootstrapTimelineCursor({
          timestamp: last.timestamp,
          eventId: last.event_id,
        })
      : null;

  log.info('bootstrap_timeline_ok', {
    appUserId: appUser.appUserId,
    eventCount: events.length,
    hasNextCursor: Boolean(nextCursor),
  });

  return jsonResponse({
    events,
    next_cursor: nextCursor,
  } satisfies BootstrapTimelineResponse);
};
