import { describe, expect, it } from 'vitest';

import {
  isDeleteEventResponse,
  parseDeleteEventRequest,
} from './delete-event.ts';

describe('delete-event contract', () => {
  it('parses a valid request', () => {
    expect(
      parseDeleteEventRequest({ source_local_event_id: 'event-1' }),
    ).toEqual({ source_local_event_id: 'event-1' });
  });

  it('rejects empty source_local_event_id', () => {
    expect(parseDeleteEventRequest({ source_local_event_id: '  ' })).toBeNull();
  });

  it('validates response shape', () => {
    expect(
      isDeleteEventResponse({
        event_id: 'uuid',
        server_sync_version: 2,
        deleted_at: '2026-05-20T12:00:00.000Z',
      }),
    ).toBe(true);
  });
});
