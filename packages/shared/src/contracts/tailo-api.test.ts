import { describe, expect, it } from 'vitest';

import {
  buildTailoApiBody,
  getTailoApiFunctionForAction,
  parseTailoApiRequest,
  TAILO_API_PET_ACTIONS,
} from './tailo-api';

describe('parseTailoApiRequest', () => {
  it('parses action and strips it from payload', () => {
    expect(
      parseTailoApiRequest({
        action: 'upsert-pet',
        source_local_pet_id: 'local_pet_1',
        name: 'Mochi',
        type: 'dog',
      }),
    ).toEqual({
      action: 'upsert-pet',
      payload: {
        source_local_pet_id: 'local_pet_1',
        name: 'Mochi',
        type: 'dog',
      },
    });
  });

  it('rejects unknown actions', () => {
    expect(parseTailoApiRequest({ action: 'unknown' })).toBeNull();
  });

  it('rejects actions outside the allowed list for a domain', () => {
    expect(
      parseTailoApiRequest({ action: 'sync-event' }, TAILO_API_PET_ACTIONS),
    ).toBeNull();
  });
});

describe('buildTailoApiBody', () => {
  it('merges action with payload fields', () => {
    expect(
      buildTailoApiBody('sync-event', { source_local_event_id: 'local_1' }),
    ).toEqual({
      action: 'sync-event',
      source_local_event_id: 'local_1',
    });
  });
});

describe('getTailoApiFunctionForAction', () => {
  it('maps actions to domain functions', () => {
    expect(getTailoApiFunctionForAction('ensure-current-user')).toBe(
      'api-auth',
    );
    expect(getTailoApiFunctionForAction('upsert-pet')).toBe('api-pet');
    expect(getTailoApiFunctionForAction('upsert-account-profile')).toBe(
      'api-account',
    );
    expect(getTailoApiFunctionForAction('get-account-profile')).toBe(
      'api-account',
    );
    expect(getTailoApiFunctionForAction('delete-account')).toBe('api-account');
    expect(getTailoApiFunctionForAction('sync-event')).toBe('api-events');
  });
});
