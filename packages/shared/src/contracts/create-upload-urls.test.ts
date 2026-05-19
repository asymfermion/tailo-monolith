import {
  isCreateUploadUrlsResponse,
  parseCreateUploadUrlsRequest,
} from './create-upload-urls';

describe('parseCreateUploadUrlsRequest', () => {
  it('accepts a valid batch', () => {
    expect(
      parseCreateUploadUrlsRequest({
        pet_id: 'pet-1',
        source_local_event_id: 'local-event-1',
        assets: [{ source_local_asset_id: 'asset-1' }],
      }),
    ).toEqual({
      pet_id: 'pet-1',
      source_local_event_id: 'local-event-1',
      assets: [{ source_local_asset_id: 'asset-1' }],
    });
  });

  it('rejects duplicate asset ids', () => {
    expect(
      parseCreateUploadUrlsRequest({
        pet_id: 'pet-1',
        source_local_event_id: 'local-event-1',
        assets: [
          { source_local_asset_id: 'asset-1' },
          { source_local_asset_id: 'asset-1' },
        ],
      }),
    ).toBeNull();
  });

  it('rejects more than five assets', () => {
    expect(
      parseCreateUploadUrlsRequest({
        pet_id: 'pet-1',
        source_local_event_id: 'local-event-1',
        assets: Array.from({ length: 6 }, (_, index) => ({
          source_local_asset_id: `asset-${index}`,
        })),
      }),
    ).toBeNull();
  });
});

describe('isCreateUploadUrlsResponse', () => {
  it('validates signed url payload', () => {
    expect(
      isCreateUploadUrlsResponse({
        event_id: 'event-1',
        assets: [
          {
            source_local_asset_id: 'asset-1',
            original_upload_url: 'https://example.com/original',
            thumbnail_upload_url: 'https://example.com/thumb',
            storage_path: 'user/pet/event/asset/original.jpg',
            thumbnail_path: 'user/pet/event/asset/thumb.jpg',
            expires_at: '2026-05-18T00:00:00.000Z',
          },
        ],
      }),
    ).toBe(true);
  });
});
