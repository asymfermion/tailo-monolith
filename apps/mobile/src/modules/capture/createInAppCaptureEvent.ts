import type * as SQLite from 'expo-sqlite';

import { upsertLocalEventCandidates } from '@/db/localEventCandidates';
import { upsertLocalEvents } from '@/db/localEvents';
import {
  upsertLocalAssets,
  updateLocalAssetDetectionResults,
} from '@/db/localAssets';
import { upsertLocalMediaScores } from '@/db/localMediaScores';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';
import { resolveLocalPetId } from '@/modules/pets/resolveLocalPetId';
import { enqueueEventMediaUploads, runUploadQueueWorker } from '@/modules/sync';

import { buildInAppCaptureRecords } from './buildInAppCaptureRecords';
import type { PersistedCaptureImage } from './persistCaptureImage';

export type CreateInAppCaptureEventInput = PersistedCaptureImage & {
  width: number;
  height: number;
  capturedAt?: string;
};

export type CreateInAppCaptureEventResult = {
  localEventId: string;
  localAssetId: string;
};

export async function createInAppCaptureEvent(
  database: SQLite.SQLiteDatabase,
  input: CreateInAppCaptureEventInput,
  options?: { petId?: string },
): Promise<CreateInAppCaptureEventResult> {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const petId = options?.petId ?? (await resolveLocalPetId());
  const profile = await loadLocalPetProfile();
  const records = buildInAppCaptureRecords({
    localAssetId: input.localAssetId,
    uri: input.uri,
    width: input.width,
    height: input.height,
    capturedAt,
    petId,
    detectedPetType: profile?.type ?? null,
  });

  await upsertLocalAssets(database, [records.asset]);
  await updateLocalAssetDetectionResults(database, [
    {
      localAssetId: input.localAssetId,
      isPetCandidate: true,
      petConfidence: 1,
      detectedPetType: records.asset.detectedPetType ?? null,
      detectionSource: 'in_app',
      detectionDebugLabel: null,
      detectedBreed: null,
    },
  ]);
  await upsertLocalEventCandidates(database, [
    {
      localEventId: records.event.localEventId,
      timestamp: records.event.timestamp,
      source: records.event.source,
      candidateStatus: 'ready',
      processingState: 'processed',
      selectedAssetIds: records.event.selectedAssetIds,
    },
  ]);
  await upsertLocalMediaScores(database, [records.score]);
  await upsertLocalEvents(database, [records.event]);
  await enqueueEventMediaUploads(
    database,
    records.event.localEventId,
    records.event.selectedAssetIds,
  );
  void runUploadQueueWorker();

  return {
    localEventId: records.event.localEventId,
    localAssetId: input.localAssetId,
  };
}
