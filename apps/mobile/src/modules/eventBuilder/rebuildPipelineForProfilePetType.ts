import type { getDatabase } from '@/db';
import { clearLocalEventPipeline } from '@/db/localEventCandidates';
import { pruneLocalTimelineForProfilePetType } from '@/db/localEvents';
import { reapplyPetCandidateFlagsForProfile } from '@/db/localAssets';
import { setSyncStateValue, SYNC_STATE_KEYS } from '@/db/syncState';
import type { LocalPetType } from '@/modules/pets/petProfile';

import { selectBestEventImages } from './bestImageSelection';
import { clusterLocalPetEvents } from './eventClustering';
import { promoteScoredCandidatesToLocalEvents } from './eventPromotion';

export type RebuildPipelineForProfilePetTypeResult = {
  updatedAssetCount: number;
};

export async function rebuildPipelineForProfilePetType(
  database: Awaited<ReturnType<typeof getDatabase>>,
  profilePetType: LocalPetType,
): Promise<RebuildPipelineForProfilePetTypeResult> {
  const updatedAssetCount = await reapplyPetCandidateFlagsForProfile(
    database,
    profilePetType,
  );

  await clearLocalEventPipeline(database);
  await clusterLocalPetEvents({ database, profilePetType });
  await selectBestEventImages({ database });
  await promoteScoredCandidatesToLocalEvents({ database });
  await pruneLocalTimelineForProfilePetType(database, profilePetType);
  await setSyncStateValue(
    database,
    SYNC_STATE_KEYS.PROFILE_PET_FILTER_APPLIED,
    profilePetType,
  );

  return { updatedAssetCount };
}
