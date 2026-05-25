import type * as SQLite from 'expo-sqlite';

import { pollEventUpdates } from './pollEventUpdates';
import { getEventUpdates } from './getEventUpdates';
import { applyRemoteEventUpdates } from './applyRemoteEventUpdates';
import {
  refreshHydratedTimelineThumbnailsIfNeeded,
  runHydratedTimelineBackfillPass,
} from './backfillCloudTimeline';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import { getSyncStateValue, setSyncStateValue } from '@/db/syncState';

jest.mock('@/modules/auth/authService', () => ({
  getAuthSession: jest.fn(),
  isRemoteAuthConfigured: jest.fn(),
}));

jest.mock('@/db/syncState', () => ({
  getSyncStateValue: jest.fn(),
  setSyncStateValue: jest.fn(),
  SYNC_STATE_KEYS: {
    EVENTS_CURSOR: 'sync.events_cursor',
  },
}));

jest.mock('./getEventUpdates', () => ({
  getEventUpdates: jest.fn(),
}));

jest.mock('./applyRemoteEventUpdates', () => ({
  applyRemoteEventUpdates: jest.fn(),
}));

jest.mock('./backfillCloudTimeline', () => ({
  runHydratedTimelineBackfillPass: jest.fn(),
  refreshHydratedTimelineThumbnailsIfNeeded: jest.fn(),
}));

describe('pollEventUpdates', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    });
    jest.mocked(getSyncStateValue).mockResolvedValue(null);
    jest.mocked(getEventUpdates).mockResolvedValue({
      status: 'success',
      response: { events: [], next_cursor: null },
    });
    jest.mocked(applyRemoteEventUpdates).mockResolvedValue(0);
    jest.mocked(runHydratedTimelineBackfillPass).mockResolvedValue({
      hydratedCount: 0,
      completed: true,
    });
    jest.mocked(refreshHydratedTimelineThumbnailsIfNeeded).mockResolvedValue(0);
  });

  it('adds backfill and thumbnail refresh counts to applied', async () => {
    jest.mocked(getEventUpdates).mockResolvedValue({
      status: 'success',
      response: {
        events: [
          {
            event_id: 'event-1',
            source_local_event_id: 'local-event-1',
            event_type: 'play',
            caption: null,
            caption_source: 'placeholder',
            is_favorite: false,
            sync_version: 1,
            updated_at: '2026-05-25T00:00:00.000Z',
            user_edited_caption: false,
            user_edited_event_type: false,
            ai_job_status: null,
            pet_validation_status: 'valid',
            deleted_at: null,
          },
        ],
        next_cursor: 'cursor-1',
      },
    });
    jest.mocked(applyRemoteEventUpdates).mockResolvedValue(1);
    jest.mocked(runHydratedTimelineBackfillPass).mockResolvedValue({
      hydratedCount: 2,
      completed: false,
    });
    jest.mocked(refreshHydratedTimelineThumbnailsIfNeeded).mockResolvedValue(1);

    await expect(pollEventUpdates(database)).resolves.toEqual({
      applied: 4,
      skippedReason: null,
    });

    expect(setSyncStateValue).toHaveBeenCalledWith(
      database,
      'sync.events_cursor',
      'cursor-1',
    );
  });
});
