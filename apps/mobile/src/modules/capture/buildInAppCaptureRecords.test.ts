import { buildInAppCaptureRecords } from './buildInAppCaptureRecords';

describe('buildInAppCaptureRecords', () => {
  it('builds asset, event, and score rows for an in-app capture', () => {
    const records = buildInAppCaptureRecords({
      localAssetId: 'in_app_abc',
      uri: 'file:///captures/in_app_abc.jpg',
      width: 1200,
      height: 1600,
      capturedAt: '2026-05-18T12:00:00.000Z',
      petId: 'local_pet_1',
      detectedPetType: 'dog',
    });

    expect(records.event).toEqual({
      localEventId: 'capture_event_in_app_abc',
      petId: 'local_pet_1',
      timestamp: '2026-05-18T12:00:00.000Z',
      source: 'in_app',
      eventType: 'unknown',
      selectedAssetIds: ['in_app_abc'],
      processingState: 'processed',
    });
    expect(records.asset.isPetCandidate).toBe(true);
    expect(records.score.isPrimary).toBe(true);
  });
});
