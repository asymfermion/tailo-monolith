import { mapLocalEventToSharedEvent } from './eventMapper';

describe('mapLocalEventToSharedEvent', () => {
  it('maps a local event row to the shared Event contract', () => {
    expect(
      mapLocalEventToSharedEvent({
        localEventId: 'local-event-1',
        petId: 'local_pet_1',
        timestamp: '2026-05-17T03:30:00.000Z',
        source: 'camera_roll',
        eventType: 'walk',
        caption: 'Morning walk',
        captionLanguage: 'en',
        confidence: 0.82,
        isFavorite: true,
        processingState: 'processed',
        selectedAssetIds: ['asset-1'],
        createdAt: '2026-05-17T03:00:00.000Z',
        updatedAt: '2026-05-17T03:31:00.000Z',
      }),
    ).toEqual({
      id: 'local-event-1',
      petId: 'local_pet_1',
      timestamp: '2026-05-17T03:30:00.000Z',
      eventType: 'walk',
      caption: 'Morning walk',
      captionLanguage: 'en',
      confidence: 0.82,
      source: 'camera_roll',
      isFavorite: true,
    });
  });
});
