import type {
  DetectedPetType,
  NewLocalAsset,
  NewLocalEvent,
  NewLocalMediaScore,
} from '@/types';

import { createCaptureEventId } from './captureIds';

export type InAppCaptureRecordInput = {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
  capturedAt: string;
  petId: string;
  detectedPetType?: DetectedPetType | null;
};

export type InAppCaptureRecords = {
  asset: NewLocalAsset;
  event: NewLocalEvent;
  score: NewLocalMediaScore;
};

export function buildInAppCaptureRecords(
  input: InAppCaptureRecordInput,
): InAppCaptureRecords {
  const localEventId = createCaptureEventId(input.localAssetId);

  return {
    asset: {
      localAssetId: input.localAssetId,
      uri: input.uri,
      createdAt: input.capturedAt,
      width: input.width,
      height: input.height,
      mediaType: 'photo',
      processingStatus: 'processed',
      processedAt: input.capturedAt,
      isPetCandidate: true,
      petConfidence: 1,
      detectedPetType: input.detectedPetType ?? null,
    },
    event: {
      localEventId,
      petId: input.petId,
      timestamp: input.capturedAt,
      source: 'in_app',
      eventType: 'unknown',
      selectedAssetIds: [input.localAssetId],
      processingState: 'processed',
    },
    score: {
      localAssetId: input.localAssetId,
      localEventId,
      sharpness: 1,
      brightness: 0.85,
      subjectVisibility: 1,
      uniqueness: 1,
      overallScore: 1,
      isPrimary: true,
    },
  };
}
