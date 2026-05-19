import {
  decodeEventUpdateCursor,
  encodeEventUpdateCursor,
} from '../../../packages/backend-core/src/usecases/eventUpdateCursor.ts';
import { parseGetEventUpdatesRequest } from '../../../packages/shared/src/contracts/get-event-updates.ts';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  handleOptions,
  jsonResponse,
} from '../_shared/http.ts';

const DEFAULT_LIMIT = 50;

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

    const body = parseGetEventUpdatesRequest(await request.json().catch(() => ({})));

    if (body === null) {
      return jsonResponse({ error: 'Invalid request body' }, 422);
    }

    const limit = body.limit ?? DEFAULT_LIMIT;
    const cursor = decodeEventUpdateCursor(body.cursor);
    const adminClient = getServiceRoleClient();

    let query = adminClient
      .from('events')
      .select(
        'event_id, source_local_event_id, event_type, caption, caption_source, is_favorite, sync_version, updated_at, user_edited_caption, user_edited_event_type',
      )
      .eq('user_id', authResult.user.id)
      .order('updated_at', { ascending: true })
      .order('event_id', { ascending: true })
      .limit(limit);

    if (cursor) {
      query = query.gt('updated_at', cursor.updatedAt);
    }

    const { data: rows, error } = await query;

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const eventIds = (rows ?? []).map((row) => row.event_id);
    const jobsByEvent = new Map<string, string>();

    if (eventIds.length > 0) {
      const { data: jobs } = await adminClient
        .from('ai_jobs')
        .select('event_id, status')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });

      for (const job of jobs ?? []) {
        if (!jobsByEvent.has(job.event_id)) {
          jobsByEvent.set(job.event_id, job.status);
        }
      }
    }

    const events = (rows ?? []).map((row) => ({
      event_id: row.event_id,
      source_local_event_id: row.source_local_event_id,
      event_type: row.event_type,
      caption: row.caption,
      caption_source: row.caption_source,
      is_favorite: row.is_favorite,
      sync_version: row.sync_version,
      updated_at: row.updated_at,
      user_edited_caption: row.user_edited_caption,
      user_edited_event_type: row.user_edited_event_type,
      ai_job_status: jobsByEvent.get(row.event_id) ?? null,
    }));

    const last = events.at(-1);
    const nextCursor =
      events.length === limit && last
        ? encodeEventUpdateCursor({
            updatedAt: last.updated_at,
            eventId: last.event_id,
          })
        : null;

    return jsonResponse({
      events,
      next_cursor: nextCursor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
