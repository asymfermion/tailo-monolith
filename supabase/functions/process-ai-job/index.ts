import { applyAiResultToEvent } from '../../../packages/backend-core/src/usecases/applyAiResultToEvent.ts';
import { generateStubCaption } from '../../../packages/ai/src/providers/stubCaptionProvider.ts';
import { generateVertexCaption } from '../../../packages/ai/src/providers/vertexCaptionProvider.ts';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  handleOptions,
  jsonResponse,
} from '../_shared/http.ts';

const AI_BACKOFF_MINUTES = [1, 5, 15];
const MAX_ATTEMPTS = 3;
const LEASE_SECONDS = 120;

function getBackoffIso(attemptCount: number): string {
  const minutes = AI_BACKOFF_MINUTES[Math.min(attemptCount, AI_BACKOFF_MINUTES.length - 1)] ?? 15;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function getVertexAccessToken(serviceAccountJson: string): Promise<string | null> {
  try {
    const account = JSON.parse(serviceAccountJson) as {
      client_email: string;
      private_key: string;
      token_uri?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: account.client_email,
      sub: account.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      iat: now,
      exp: now + 3600,
    };

    const encode = (value: Record<string, unknown>) =>
      btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const unsignedToken = `${encode(header)}.${encode(claim)}`;
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(account.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(unsignedToken),
    );
    const signedToken = `${unsignedToken}.${arrayBufferToBase64Url(signature)}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedToken,
      }),
    });

    if (!tokenResponse.ok) {
      return null;
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    return tokenPayload.access_token ?? null;
  } catch {
    return null;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (request) => {
  const options = handleOptions(request);

  if (options) {
    return options;
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = request.headers.get('Authorization');
  const isServiceCall = authHeader === `Bearer ${serviceRoleKey}`;

  if (!isServiceCall) {
    const authResult = await getAuthenticatedUser(request);

    if ('error' in authResult) {
      return authResult.error;
    }
  }

  try {
    const adminClient = getServiceRoleClient();
    const nowIso = new Date().toISOString();
    const leaseUntil = new Date(Date.now() + LEASE_SECONDS * 1000).toISOString();

    const { data: job, error: leaseError } = await adminClient
      .from('ai_jobs')
      .select('ai_job_id, event_id, status, attempt_count, input_snapshot')
      .eq('status', 'pending')
      .lte('next_attempt_at', nowIso)
      .order('next_attempt_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (leaseError) {
      return jsonResponse({ error: leaseError.message }, 500);
    }

    if (!job) {
      return jsonResponse({ status: 'idle' });
    }

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
        'event_id, user_id, pet_id, timestamp, source, event_type, caption, caption_source, user_edited_caption, user_edited_event_type, sync_version',
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

      return jsonResponse({ status: 'failed', ai_job_id: job.ai_job_id });
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

      return jsonResponse({ status: 'failed', ai_job_id: job.ai_job_id });
    }

    const { data: signedRead } = await adminClient.storage
      .from('event-media')
      .createSignedUrl(media.storage_path, 300);

    const provider = Deno.env.get('AI_PROVIDER') ?? 'stub';
    let aiResult;

    if (provider === 'vertex') {
      const projectId = Deno.env.get('GCP_PROJECT_ID');
      const region = Deno.env.get('GCP_VERTEX_REGION') ?? 'us-central1';
      const model = Deno.env.get('GCP_VERTEX_MODEL') ?? 'gemini-2.0-flash-001';
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
      const nextAttempt = job.attempt_count + 1;

      if (nextAttempt >= MAX_ATTEMPTS) {
        await adminClient
          .from('ai_jobs')
          .update({
            status: 'failed',
            attempt_count: nextAttempt,
            last_error: aiResult.error,
            updated_at: nowIso,
          })
          .eq('ai_job_id', job.ai_job_id);
      } else {
        await adminClient
          .from('ai_jobs')
          .update({
            status: 'pending',
            attempt_count: nextAttempt,
            next_attempt_at: getBackoffIso(nextAttempt),
            last_error: aiResult.error,
            leased_until: null,
            updated_at: nowIso,
          })
          .eq('ai_job_id', job.ai_job_id);
      }

      return jsonResponse({
        status: 'retry',
        ai_job_id: job.ai_job_id,
        message: aiResult.error,
      });
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

    return jsonResponse({
      status: 'done',
      ai_job_id: job.ai_job_id,
      event_id: job.event_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
