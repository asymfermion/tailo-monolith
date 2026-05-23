import { applyAiResultToEvent } from '../../../packages/backend-core/src/usecases/applyAiResultToEvent.ts';
import { resolveAiJobFailure } from '../../../packages/backend-core/src/usecases/aiJobFailure.ts';
import { AI_JOB_LEASE_SECONDS } from '../../../packages/backend-core/src/usecases/aiJobLease.ts';
import { resolvePetValidationStatus } from '../../../packages/backend-core/src/usecases/cloudPetValidation.ts';
import { generateStubCaption } from '../../../packages/ai/src/providers/stubCaptionProvider.ts';
import { generateVertexCaption } from '../../../packages/ai/src/providers/vertexCaptionProvider.ts';
import type { getServiceRoleClient } from '../_shared/http.ts';
import type { FunctionLogger } from '../_shared/logger.ts';

import { getVertexAccessToken } from './vertexAuth.ts';

export async function processOneJobPass(
  adminClient: ReturnType<typeof getServiceRoleClient>,
  log: FunctionLogger,
  nowIso: string,
): Promise<Record<string, unknown>> {
  const leaseUntil = new Date(
    Date.now() + AI_JOB_LEASE_SECONDS * 1000,
  ).toISOString();

  const { data: job, error: leaseError } = await adminClient
    .from('ai_jobs')
    .select('ai_job_id, event_id, status, attempt_count, input_snapshot')
    .eq('status', 'pending')
    .lte('next_attempt_at', nowIso)
    .order('next_attempt_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (leaseError) {
    log.error('job_lease_query_failed', { message: leaseError.message });
    return { error: leaseError.message, status: 'error' };
  }

  if (!job) {
    return { status: 'idle', reason: 'no_pending_jobs' };
  }

  log.info('job_leased', {
    aiJobId: job.ai_job_id,
    eventId: job.event_id,
    attemptCount: job.attempt_count,
  });

  await adminClient
    .from('ai_jobs')
    .update({
      status: 'processing',
      leased_until: leaseUntil,
      updated_at: nowIso,
    })
    .eq('ai_job_id', job.ai_job_id)
    .eq('status', 'pending');

  const { data: event, error: eventError } = await adminClient
    .from('events')
    .select(
      'event_id, app_user_id, pet_id, timestamp, source, event_type, caption, caption_source, user_edited_caption, user_edited_event_type, sync_version',
    )
    .eq('event_id', job.event_id)
    .maybeSingle();

  if (eventError || !event) {
    await adminClient
      .from('ai_jobs')
      .update({
        status: 'failed',
        last_error: 'Event not found for AI job.',
        updated_at: nowIso,
      })
      .eq('ai_job_id', job.ai_job_id);

    return { status: 'failed', ai_job_id: job.ai_job_id };
  }

  const { data: petRow } = await adminClient
    .from('pets')
    .select('type')
    .eq('pet_id', event.pet_id)
    .maybeSingle();

  const petType = petRow?.type === 'cat' ? 'cat' : 'dog';

  const { data: media } = await adminClient
    .from('event_media')
    .select('storage_path, is_primary')
    .eq('event_id', job.event_id)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!media?.storage_path) {
    await adminClient
      .from('ai_jobs')
      .update({
        status: 'failed',
        last_error: 'Missing event media for AI job.',
        updated_at: nowIso,
      })
      .eq('ai_job_id', job.ai_job_id);

    return { status: 'failed', ai_job_id: job.ai_job_id };
  }

  const { data: signedRead } = await adminClient.storage
    .from('event-media')
    .createSignedUrl(media.storage_path, 300);

  const provider = Deno.env.get('AI_PROVIDER') ?? 'stub';
  log.info('ai_provider', { provider });
  let aiResult;

  if (provider === 'vertex') {
    const projectId = Deno.env.get('GCP_PROJECT_ID');
    const region = Deno.env.get('GCP_VERTEX_REGION') ?? 'us-central1';
    const model = Deno.env.get('GCP_VERTEX_MODEL') ?? 'gemini-2.5-flash';
    const serviceAccountJson = Deno.env.get('GCP_SERVICE_ACCOUNT_JSON');

    if (!projectId || !serviceAccountJson || !signedRead?.signedUrl) {
      aiResult = { error: 'Vertex AI is not configured.' };
    } else {
      const accessToken = await getVertexAccessToken(serviceAccountJson);

      if (!accessToken) {
        aiResult = { error: 'Could not obtain GCP access token.' };
      } else {
        const imageResponse = await fetch(signedRead.signedUrl);

        if (!imageResponse.ok) {
          aiResult = { error: 'Could not read primary image from storage.' };
        } else {
          const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
          let binary = '';

          for (const byte of imageBytes) {
            binary += String.fromCharCode(byte);
          }

          aiResult = await generateVertexCaption(
            {
              projectId,
              region,
              model,
              accessToken,
            },
            {
              petType: petType === 'cat' ? 'cat' : 'dog',
              eventSource: event.source,
              timestamp: event.timestamp,
              imageBase64: btoa(binary),
            },
          );
        }
      }
    }
  } else {
    aiResult = generateStubCaption({
      petType: petType === 'cat' ? 'cat' : 'dog',
      eventSource: event.source,
      timestamp: event.timestamp,
    });
  }

  if ('error' in aiResult) {
    if ('debug' in aiResult && aiResult.debug) {
      log.warn('vertex_response_parse_failed', {
        ai_job_id: job.ai_job_id,
        event_id: job.event_id,
        ...aiResult.debug,
      });
    }

    const failure = resolveAiJobFailure(job.attempt_count, Date.parse(nowIso));

    if (failure.status === 'failed') {
      await adminClient
        .from('ai_jobs')
        .update({
          status: 'failed',
          attempt_count: failure.attemptCount,
          last_error: aiResult.error,
          updated_at: nowIso,
        })
        .eq('ai_job_id', job.ai_job_id);
    } else {
      await adminClient
        .from('ai_jobs')
        .update({
          status: 'pending',
          attempt_count: failure.attemptCount,
          next_attempt_at: failure.nextAttemptAt,
          last_error: aiResult.error,
          leased_until: null,
          updated_at: nowIso,
        })
        .eq('ai_job_id', job.ai_job_id);
    }

    return {
      status: 'retry',
      ai_job_id: job.ai_job_id,
      message: aiResult.error,
    };
  }

  const petValidationStatus = resolvePetValidationStatus(aiResult, petType);

  if (petValidationStatus === 'rejected') {
    await adminClient.from('event_media').delete().eq('event_id', job.event_id);

    await adminClient
      .from('events')
      .update({
        pet_validation_status: 'rejected',
        deleted_at: nowIso,
        caption: null,
        caption_source: 'placeholder',
        sync_version: (event.sync_version ?? 0) + 1,
        updated_at: nowIso,
      })
      .eq('event_id', job.event_id);

    await adminClient
      .from('ai_jobs')
      .update({
        status: 'done',
        result_json: aiResult,
        last_error: 'Cloud pet validation rejected primary image.',
        leased_until: null,
        updated_at: nowIso,
      })
      .eq('ai_job_id', job.ai_job_id);

    log.warn('pet_validation_rejected', {
      aiJobId: job.ai_job_id,
      eventId: job.event_id,
      profilePetValid: aiResult.profilePetValid,
      visiblePetType: aiResult.visiblePetType,
      petValidationConfidence: aiResult.petValidationConfidence,
    });

    return {
      status: 'rejected',
      ai_job_id: job.ai_job_id,
      event_id: job.event_id,
      pet_validation_status: 'rejected',
    };
  }

  const applied = applyAiResultToEvent(
    {
      caption: event.caption,
      eventType: event.event_type,
      captionSource: event.caption_source,
      userEditedCaption: event.user_edited_caption,
      userEditedEventType: event.user_edited_event_type,
    },
    aiResult,
  );

  await adminClient
    .from('events')
    .update({
      caption: applied.caption,
      event_type: applied.eventType,
      caption_source: applied.captionSource,
      pet_validation_status: 'valid',
      sync_version: (event.sync_version ?? 0) + 1,
      updated_at: nowIso,
    })
    .eq('event_id', job.event_id);

  await adminClient
    .from('ai_jobs')
    .update({
      status: 'done',
      result_json: aiResult,
      last_error: null,
      leased_until: null,
      updated_at: nowIso,
    })
    .eq('ai_job_id', job.ai_job_id);

  log.info('job_done', {
    aiJobId: job.ai_job_id,
    eventId: job.event_id,
    captionSource: applied.captionSource,
    petValidationStatus: 'valid',
  });

  return {
    status: 'done',
    ai_job_id: job.ai_job_id,
    event_id: job.event_id,
    pet_validation_status: 'valid',
  };
}
