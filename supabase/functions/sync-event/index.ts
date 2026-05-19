import { mergeSyncEventPayload } from '../../../packages/backend-core/src/usecases/syncEventMerge.ts';
import { parseSyncEventRequest } from '../../../packages/shared/src/contracts/sync-event.ts';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  handleOptions,
  jsonResponse,
} from '../_shared/http.ts';

const AI_JOB_TYPE = 'caption_event';

async function triggerProcessAiJob(): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  try {
    await fetch(`${supabaseUrl}/functions/v1/process-ai-job`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sweep: true }),
    });
  } catch {
    // Fire-and-forget — scheduled sweep can recover.
  }
}

Deno.serve(async (request) => {
  const options = handleOptions(request);

  if (options) {
    return options;
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authResult = await getAuthenticatedUser(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const body = parseSyncEventRequest(await request.json().catch(() => null));

    if (!body) {
      return jsonResponse({ error: 'Invalid request body' }, 422);
    }

    const adminClient = getServiceRoleClient();

    const { data: petRow, error: petError } = await adminClient
      .from('pets')
      .select('pet_id, user_id')
      .eq('pet_id', body.pet_id)
      .maybeSingle();

    if (petError) {
      return jsonResponse({ error: petError.message }, 500);
    }

    if (!petRow || petRow.user_id !== authResult.user.id) {
      return jsonResponse({ error: 'Pet not found for this account.' }, 403);
    }

    const { data: existingRow, error: existingError } = await adminClient
      .from('events')
      .select(
        'event_id, user_id, pet_id, source_local_event_id, timestamp, source, event_type, caption, caption_source, is_favorite, user_edited_caption, user_edited_event_type, sync_version',
      )
      .eq('user_id', authResult.user.id)
      .eq('source_local_event_id', body.source_local_event_id)
      .maybeSingle();

    if (existingError) {
      return jsonResponse({ error: existingError.message }, 500);
    }

    const merged = mergeSyncEventPayload({
      callerUserId: authResult.user.id,
      request: body,
      existing: existingRow
        ? {
            eventId: existingRow.event_id,
            userId: existingRow.user_id,
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
    const upsertPayload = {
      event_id: merged.eventId,
      user_id: authResult.user.id,
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
      updated_at: now,
    };

    const { error: upsertError } = await adminClient.from('events').upsert(upsertPayload);

    if (upsertError) {
      return jsonResponse({ error: upsertError.message }, 500);
    }

    await adminClient.from('event_media').delete().eq('event_id', merged.eventId);

    const mediaRows = body.media.map((item) => ({
      event_media_id: crypto.randomUUID(),
      event_id: merged.eventId,
      source_local_asset_id: item.source_local_asset_id,
      storage_path: item.storage_path,
      thumbnail_path: item.thumbnail_path,
      width: item.width,
      height: item.height,
      is_primary: item.is_primary,
      detected_pet_type: item.detected_pet_type ?? null,
    }));

    const { error: mediaError } = await adminClient.from('event_media').insert(mediaRows);

    if (mediaError) {
      return jsonResponse({ error: mediaError.message }, 500);
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

      if ((activeJobs?.length ?? 0) === 0 && (!doneJob || primaryChanged)) {
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
          void triggerProcessAiJob();
        }
      } else {
        aiJobResponse = { ai_job_id: doneJob?.ai_job_id ?? '', status: 'skipped' };
      }
    } else {
      aiJobResponse = { status: 'skipped', ai_job_id: '' };
    }

    return jsonResponse({
      event_id: merged.eventId,
      server_sync_version: merged.nextSyncVersion,
      ai_job: aiJobResponse?.ai_job_id ? aiJobResponse : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
