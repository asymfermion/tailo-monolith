import type { getDatabase } from '@/db';
import {
  getPromotableEventCandidates,
  upsertLocalEvents,
} from '@/db/localEvents';
import {
  markEventCandidatesProcessed,
  markEventCandidatesProcessing,
} from '@/db/localEventCandidates';
import { resolveLocalPetId } from '@/modules/pets/resolveLocalPetId';
import { enqueueEventMediaUploads } from '@/modules/sync/enqueueEventMediaUploads';
import { runUploadQueueWorker } from '@/modules/sync/uploadQueueWorker';
import type { NewLocalEvent } from '@/types';

export type PromoteLocalEventsProgress = {
  candidateCount: number;
  promotedCount: number;
};

export type PromoteLocalEventsOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  petId?: string;
  onProgress?: (progress: PromoteLocalEventsProgress) => void;
};

export async function promoteScoredCandidatesToLocalEvents({
  database,
  petId: petIdOverride,
  onProgress,
}: PromoteLocalEventsOptions): Promise<PromoteLocalEventsProgress> {
  const petId = petIdOverride ?? (await resolveLocalPetId());
  const candidates = await getPromotableEventCandidates(database);

  if (candidates.length === 0) {
    return { candidateCount: 0, promotedCount: 0 };
  }

  await markEventCandidatesProcessing(
    database,
    candidates.map((candidate) => candidate.localEventId),
  );

  const events: NewLocalEvent[] = candidates.map((candidate) => ({
    localEventId: candidate.localEventId,
    petId,
    timestamp: candidate.timestamp,
    source: candidate.source,
    eventType: 'unknown',
    selectedAssetIds: parseSelectedAssetIds(candidate.selectedAssetIds),
    processingState: 'processed',
  }));

  const promotedCount = await upsertLocalEvents(database, events);
  await markEventCandidatesProcessed(
    database,
    candidates.map((candidate) => candidate.localEventId),
  );

  for (const event of events) {
    await enqueueEventMediaUploads(
      database,
      event.localEventId,
      event.selectedAssetIds,
    );
  }

  void runUploadQueueWorker(database);

  onProgress?.({
    candidateCount: candidates.length,
    promotedCount,
  });

  return {
    candidateCount: candidates.length,
    promotedCount,
  };
}

function parseSelectedAssetIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
