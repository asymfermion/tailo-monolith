export type DeleteEventRequest = {
  source_local_event_id: string;
};

export type DeleteEventResponse = {
  event_id: string;
  server_sync_version: number;
  deleted_at: string;
};

export function parseDeleteEventRequest(
  body: unknown,
): DeleteEventRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const sourceLocalEventId = Reflect.get(body, 'source_local_event_id');

  if (typeof sourceLocalEventId !== 'string' || !sourceLocalEventId.trim()) {
    return null;
  }

  return { source_local_event_id: sourceLocalEventId.trim() };
}

export function isDeleteEventResponse(
  value: unknown,
): value is DeleteEventResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof Reflect.get(value, 'event_id') === 'string' &&
    typeof Reflect.get(value, 'server_sync_version') === 'number' &&
    typeof Reflect.get(value, 'deleted_at') === 'string'
  );
}
