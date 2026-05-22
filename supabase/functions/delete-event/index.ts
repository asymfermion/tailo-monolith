import { parseDeleteEventRequest } from '../../../packages/shared/src/contracts/delete-event.ts';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  jsonResponse,
} from '../_shared/http.ts';
import { servePostFunction } from '../_shared/serve.ts';

const EVENT_MEDIA_BUCKET = 'event-media';

servePostFunction('delete-event', async (request, log) => {
  const authResult = await getAuthenticatedUser(request, log);

  if ('error' in authResult) {
    return authResult.error;
  }

  const body = parseDeleteEventRequest(await request.json().catch(() => null));

  if (!body) {
    return jsonResponse({ error: 'Invalid request body' }, 422);
  }

  const adminClient = getServiceRoleClient();
  const { data: eventRow, error: eventError } = await adminClient
    .from('events')
    .select('event_id, sync_version, deleted_at')
    .eq('user_id', authResult.user.id)
    .eq('source_local_event_id', body.source_local_event_id)
    .maybeSingle();

  if (eventError) {
    return jsonResponse({ error: eventError.message }, 500);
  }

  if (!eventRow) {
    return jsonResponse({ error: 'Event not found.' }, 404);
  }

  const now = new Date().toISOString();

  if (eventRow.deleted_at) {
    log.info('delete_event_idempotent', {
      eventId: eventRow.event_id,
      sourceLocalEventId: body.source_local_event_id,
    });

    return jsonResponse({
      event_id: eventRow.event_id,
      server_sync_version: eventRow.sync_version ?? 0,
      deleted_at: eventRow.deleted_at,
    });
  }

  const { data: mediaRows, error: mediaError } = await adminClient
    .from('event_media')
    .select('storage_path, thumbnail_path')
    .eq('event_id', eventRow.event_id);

  if (mediaError) {
    return jsonResponse({ error: mediaError.message }, 500);
  }

  const storagePaths = new Set<string>();

  for (const row of mediaRows ?? []) {
    if (row.storage_path) {
      storagePaths.add(row.storage_path);
    }

    if (row.thumbnail_path) {
      storagePaths.add(row.thumbnail_path);
    }
  }

  if (storagePaths.size > 0) {
    const { error: storageError } = await adminClient.storage
      .from(EVENT_MEDIA_BUCKET)
      .remove([...storagePaths]);

    if (storageError) {
      log.warn('delete_event_storage_error', {
        eventId: eventRow.event_id,
        message: storageError.message,
      });
    }
  }

  const { error: deleteMediaError } = await adminClient
    .from('event_media')
    .delete()
    .eq('event_id', eventRow.event_id);

  if (deleteMediaError) {
    return jsonResponse({ error: deleteMediaError.message }, 500);
  }

  await adminClient
    .from('ai_jobs')
    .update({
      status: 'failed',
      last_error: 'Event deleted by user.',
      leased_until: null,
      updated_at: now,
    })
    .eq('event_id', eventRow.event_id)
    .in('status', ['pending', 'processing']);

  const nextSyncVersion = (eventRow.sync_version ?? 0) + 1;

  const { error: updateError } = await adminClient
    .from('events')
    .update({
      deleted_at: now,
      sync_version: nextSyncVersion,
      updated_at: now,
    })
    .eq('event_id', eventRow.event_id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  log.info('delete_event_ok', {
    eventId: eventRow.event_id,
    sourceLocalEventId: body.source_local_event_id,
    mediaRemoved: storagePaths.size,
  });

  return jsonResponse({
    event_id: eventRow.event_id,
    server_sync_version: nextSyncVersion,
    deleted_at: now,
  });
});
