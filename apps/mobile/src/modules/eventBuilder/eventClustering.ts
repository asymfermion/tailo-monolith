import type { getDatabase } from '@/db';
import { upsertLocalEventCandidates } from '@/db/localEventCandidates';
import { getLocalPetCandidateAssets } from '@/db/localAssets';
import { loadLocalPetProfile, type LocalPetType } from '@/modules/pets';

import { buildEventCandidates } from './clustering';

export type EventClusteringProgress = {
  petCandidateCount: number;
  eventCandidateCount: number;
  persistedCount: number;
};

export type ClusterLocalPetEventsOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  profilePetType?: LocalPetType | null;
  onProgress?: (progress: EventClusteringProgress) => void;
};

export async function clusterLocalPetEvents({
  database,
  profilePetType: profilePetTypeOverride,
  onProgress,
}: ClusterLocalPetEventsOptions): Promise<EventClusteringProgress> {
  const profilePetType =
    profilePetTypeOverride ?? (await loadLocalPetProfile())?.type ?? null;
  const petCandidateAssets = await getLocalPetCandidateAssets(
    database,
    profilePetType,
  );
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
