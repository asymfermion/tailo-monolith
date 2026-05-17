import type { getDatabase } from '@/db';
import { upsertLocalEventCandidates } from '@/db/localEventCandidates';
import { getLocalPetCandidateAssets } from '@/db/localAssets';

import { buildEventCandidates } from './clustering';

export type EventClusteringProgress = {
  petCandidateCount: number;
  eventCandidateCount: number;
  persistedCount: number;
};

export type ClusterLocalPetEventsOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  onProgress?: (progress: EventClusteringProgress) => void;
};

export async function clusterLocalPetEvents({
  database,
  onProgress,
}: ClusterLocalPetEventsOptions): Promise<EventClusteringProgress> {
  const petCandidateAssets = await getLocalPetCandidateAssets(database);
  const eventCandidates = buildEventCandidates(petCandidateAssets);
  const persistedCount = await upsertLocalEventCandidates(
    database,
    eventCandidates,
  );
  const progress = {
    petCandidateCount: petCandidateAssets.length,
    eventCandidateCount: eventCandidates.length,
    persistedCount,
  };

  onProgress?.(progress);

  return progress;
}
