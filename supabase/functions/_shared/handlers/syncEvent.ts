import { mergeSyncEventPayload } from '../../../../packages/backend-core/src/usecases/syncEventMerge.ts';
import { selectDedupeEventCandidate } from '../../../../packages/backend-core/src/usecases/selectDedupeEventCandidate.ts';
import { parseSyncEventRequest } from '../../../../packages/shared/src/contracts/sync-event.ts';
import {
  getServiceRoleClient,
  invokeServiceFunction,
  jsonResponse,
} from '../http.ts';
import type { FunctionLogger } from '../logger.ts';
import { resolveCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

const AI_JOB_TYPE = 'caption_event';
type ExistingEventSelectRow = {
  event_id: string;
  app_user_id: string;
  pet_id: string;
  source_local_event_id: string;
  timestamp: string;
  source: 'camera_roll' | 'in_app' | 'manual';
  event_type: 'walk' | 'play' | 'rest' | 'eating' | 'unknown';
  caption: string | null;
  caption_source: 'user' | 'ai' | 'placeholder' | null;
  is_favorite: boolean;
  user_edited_caption: boolean;
  user_edited_event_type: boolean;
  sync_version: number;
  client_timeline_generation: number;
  pet_validation_status: 'pending' | 'valid' | 'rejected';
  deleted_at: string | null;
};

type ExistingEventWithMatchScore = ExistingEventSelectRow & {
  matchScore: number;
};

async function findExistingEventByFingerprint(
  adminClient: ReturnType<typeof getServiceRoleClient>,
  appUserId: string,
  requestTimestamp: string,
  mediaFingerprints: string[],
): Promise<ExistingEventSelectRow | null> {
  if (mediaFingerprints.length === 0) {
    return null;
  }

  const { data: mediaRows, error: mediaError } = await adminClient
    .from('event_media')
    .select('event_id, media_fingerprint')
    .in('media_fingerprint', mediaFingerprints);

  if (mediaError || !mediaRows || mediaRows.length === 0) {
    return null;
  }

  const eventIds = [...new Set(mediaRows.map((row) => row.event_id))];

  if (eventIds.length === 0) {
    return null;
  }

  const { data: eventRows, error: eventError } = await adminClient
    .from('events')
    .select(
      'event_id, app_user_id, pet_id, source_local_event_id, timestamp, source, event_type, caption, caption_source, is_favorite, user_edited_caption, user_edited_event_type, sync_version, client_timeline_generation, pet_validation_status, deleted_at',
    )
    .eq('app_user_id', appUserId)
    .in('event_id', eventIds)
    .is('deleted_at', null)
    .neq('pet_validation_status', 'rejected');

  if (eventError || !eventRows || eventRows.length === 0) {
    return null;
  }

  const matchCountByEventId = new Map<string, number>();

  for (const mediaRow of mediaRows) {
    if (!mediaRow.media_fingerprint) {
      continue;
    }

    const prev = matchCountByEventId.get(mediaRow.event_id) ?? 0;
    matchCountByEventId.set(mediaRow.event_id, prev + 1);
  }

  const scored = (eventRows as ExistingEventSelectRow[])
    .map((row) => {
      return {
        ...row,
        matchScore: matchCountByEventId.get(row.event_id) ?? 0,
      };
    });
  const selected = selectDedupeEventCandidate(
    requestTimestamp,
    scored.map((row) => ({
      eventId: row.event_id,
      timestamp: row.timestamp,
      fingerprintMatchCount: row.matchScore,
    })),
  );

  if (!selected) {
    return null;
  }

  return scored.find((row) => row.event_id === selected.eventId) ?? null;
}

function triggerProcessAiJob(log: FunctionLogger): void {
  void invokeServiceFunction(
    'process-ai-job',
    { sweep: true, max_jobs: 1 },
    log,
  );
}

export const handleSyncEvent: ApiHandler = async ({ user, log, payload }) => {
  const body = parseSyncEventRequest(payload);

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 422);
  }

  const adminClient = getServiceRoleClient();
  const appUser = await resolveCallerAppUserId(user, adminClient);

  if ('error' in appUser) {
    return jsonResponse({ error: appUser.error }, 500);
  }

  log.info('sync_request', {
    appUserId: appUser.appUserId,
    sourceLocalEventId: body.source_local_event_id,
    mediaCount: body.media.length,
  });

  const { data: petRow, error: petError } = await adminClient
    .from('pets')
    .select('pet_id, app_user_id')
    .eq('pet_id', body.pet_id)
    .maybeSingle();

  if (petError) {
    return jsonResponse({ error: petError.message }, 500);
  }

  if (!petRow || petRow.app_user_id !== appUser.appUserId) {
    return jsonResponse({ error: 'Pet not found for this account.' }, 403);
  }

  const { data: existingByLocalId, error: existingError } = await adminClient
    .from('events')
    .select(
      'event_id, app_user_id, pet_id, source_local_event_id, timestamp, source, event_type, caption, caption_source, is_favorite, user_edited_caption, user_edited_event_type, sync_version, client_timeline_generation, pet_validation_status',
    )
    .eq('app_user_id', appUser.appUserId)
    .eq('source_local_event_id', body.source_local_event_id)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: existingError.message }, 500);
  }

  const mediaFingerprints = [...new Set(body.media
    .map((item) => item.media_fingerprint)
    .filter((value): value is string => typeof value === 'string' && value.length > 0))];
  const existingRow =
    (existingByLocalId as ExistingEventSelectRow | null) ??
    (await findExistingEventByFingerprint(
      adminClient,
      appUser.appUserId,
      body.timestamp,
      mediaFingerprints,
    ));

  const merged = mergeSyncEventPayload({
    callerAppUserId: appUser.appUserId,
    request: body,
    existing: existingRow
      ? {
          eventId: existingRow.event_id,
          appUserId: existingRow.app_user_id,
          petId: existingRow.pet_id,
          sourceLocalEventId: existingRow.source_local_event_id,
          timestamp: existingRow.timestamp,
          source: existingRow.source,
          eventType: existingRow.event_type,
          caption: existingRow.caption,
          captionSource: existingRow.caption_source,
          isFavorite: existingRow.is_favorite,
          userEditedCaption: existingRow.user_edited_caption,
          userEditedEventType: existingRow.user_edited_event_type,
          syncVersion: existingRow.sync_version,
        }
      : null,
  });

  if ('code' in merged) {
    return jsonResponse({ error: merged.message, code: merged.code }, 403);
  }

  const now = new Date().toISOString();
  const incomingGeneration = body.client_timeline_generation ?? 0;
  const existingGeneration = existingRow?.client_timeline_generation ?? 0;
  const generationAdvanced = incomingGeneration > existingGeneration;
  const nextTimelineGeneration = Math.max(
    incomingGeneration,
    existingGeneration,
  );

  const upsertPayload = {
    event_id: merged.eventId,
    app_user_id: appUser.appUserId,
    pet_id: merged.petId,
    source_local_event_id: body.source_local_event_id,
    timestamp: merged.timestamp,
    source: merged.source,
    event_type: merged.eventType,
    caption: merged.caption,
    caption_source: merged.captionSource,
    is_favorite: merged.isFavorite,
    user_edited_caption: merged.userEditedCaption,
    user_edited_event_type: merged.userEditedEventType,
    sync_version: merged.nextSyncVersion,
    client_timeline_generation: nextTimelineGeneration,
    pet_validation_status: generationAdvanced
      ? 'pending'
      : (existingRow?.pet_validation_status ?? 'pending'),
    deleted_at: generationAdvanced ? null : (existingRow?.deleted_at ?? null),
    updated_at: now,
  };

  const { error: upsertError } = await adminClient.from('events').upsert(upsertPayload);

  if (upsertError) {
    return jsonResponse({ error: upsertError.message }, 500);
  }

  const mediaRows = body.media.map((item) => ({
    event_media_id: crypto.randomUUID(),
    event_id: merged.eventId,
    source_local_asset_id: item.source_local_asset_id,
    media_fingerprint: item.media_fingerprint ?? null,
    storage_path: item.storage_path,
    thumbnail_path: item.thumbnail_path,
    width: item.width,
    height: item.height,
    is_primary: item.is_primary,
    detected_pet_type: item.detected_pet_type ?? null,
    detected_breed: item.detected_breed ?? null,
  }));

  // Upsert new rows first so existing rows are untouched on failure.
  const { error: mediaError } = await adminClient
    .from('event_media')
    .upsert(mediaRows, { onConflict: 'event_id,source_local_asset_id' });

  if (mediaError) {
    return jsonResponse({ error: mediaError.message }, 500);
  }

  // Remove stale rows not in the new payload. Worst case on failure: extra rows, not missing rows.
  const newAssetIds = body.media.map((m) => m.source_local_asset_id);
  if (newAssetIds.length > 0) {
    await adminClient
      .from('event_media')
      .delete()
      .eq('event_id', merged.eventId)
      .not('source_local_asset_id', 'in', `(${newAssetIds.join(',')})`);
  }

  let aiJobResponse: { ai_job_id: string; status: 'pending' | 'skipped' } | undefined;

  if (merged.shouldCreateAiJob) {
    const { data: activeJobs } = await adminClient
      .from('ai_jobs')
      .select('ai_job_id, status, input_snapshot')
      .eq('event_id', merged.eventId)
      .in('status', ['pending', 'processing']);

    const { data: doneJob } = await adminClient
      .from('ai_jobs')
      .select('ai_job_id, input_snapshot')
      .eq('event_id', merged.eventId)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const primaryChanged =
      doneJob?.input_snapshot?.primary_asset_id !== merged.primaryAssetId;

    if (
      (activeJobs?.length ?? 0) === 0 &&
      (!doneJob || primaryChanged || generationAdvanced)
    ) {
      const aiJobId = crypto.randomUUID();
      const { error: jobError } = await adminClient.from('ai_jobs').insert({
        ai_job_id: aiJobId,
        event_id: merged.eventId,
        job_type: AI_JOB_TYPE,
        status: 'pending',
        attempt_count: 0,
        next_attempt_at: now,
        input_snapshot: { primary_asset_id: merged.primaryAssetId },
        updated_at: now,
      });

      if (!jobError) {
        aiJobResponse = { ai_job_id: aiJobId, status: 'pending' };
        log.info('ai_job_enqueued', {
          aiJobId,
          eventId: merged.eventId,
        });
        triggerProcessAiJob(log);
      }
    } else {
      aiJobResponse = { ai_job_id: doneJob?.ai_job_id ?? '', status: 'skipped' };
    }
  } else {
    aiJobResponse = { status: 'skipped', ai_job_id: '' };
  }

  log.info('sync_ok', {
    eventId: merged.eventId,
    serverSyncVersion: merged.nextSyncVersion,
    aiJobStatus: aiJobResponse?.status ?? 'none',
  });

  return jsonResponse({
    event_id: merged.eventId,
    server_sync_version: merged.nextSyncVersion,
    ai_job: aiJobResponse?.ai_job_id ? aiJobResponse : undefined,
  });
};
