import { describe, expect, it } from 'vitest';

import { validateUploadRequest } from './validateUploadRequest';

describe('validateUploadRequest', () => {
  it('accepts a valid owned pet batch', () => {
    expect(
      validateUploadRequest({
        callerUserId: 'user-1',
        petId: 'pet-1',
        sourceLocalEventId: 'local-event-1',
        assets: [{ sourceLocalAssetId: 'asset-1' }],
        petOwnerUserId: 'user-1',
      }),
    ).toEqual({ ok: true });
  });

  it('rejects a pet owned by another user', () => {
    expect(
      validateUploadRequest({
        callerUserId: 'user-1',
        petId: 'pet-1',
        sourceLocalEventId: 'local-event-1',
        assets: [{ sourceLocalAssetId: 'asset-1' }],
        petOwnerUserId: 'user-2',
      }),
    ).toEqual({
      ok: false,
      code: 'forbidden',
      message: 'Pet does not belong to this account.',
    });
  });

  it('rejects duplicate asset ids', () => {
    expect(
      validateUploadRequest({
        callerUserId: 'user-1',
        petId: 'pet-1',
        sourceLocalEventId: 'local-event-1',
        assets: [
          { sourceLocalAssetId: 'asset-1' },
          { sourceLocalAssetId: 'asset-1' },
        ],
        petOwnerUserId: 'user-1',
      }),
    ).toEqual({
      ok: false,
      code: 'invalid_input',
      message: 'Duplicate source_local_asset_id in request.',
    });
  });
});
