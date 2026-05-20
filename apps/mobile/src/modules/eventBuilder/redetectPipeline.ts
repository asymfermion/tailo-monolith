import type { getDatabase } from '@/db';
import { resetLocalAssetsForRedetection } from '@/db/localAssets';
import { recordUserTimelineWipe } from '@/modules/sync/userTimelineWipe';

import {
  processPendingPetCandidates,
  type PetDetectionProgress,
} from './petDetection';

export type RedetectLocalPetPipelineOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  onDetectingProgress?: (progress: PetDetectionProgress) => void;
};

export type RedetectLocalPetPipelineResult = {
  resetAssetCount: number;
  petDetectionProgress: PetDetectionProgress;
  wipe: Awaited<ReturnType<typeof recordUserTimelineWipe>>;
};

export async function redetectLocalPetPipeline({
  database,
  onDetectingProgress,
}: RedetectLocalPetPipelineOptions): Promise<RedetectLocalPetPipelineResult> {
  const wipe = await recordUserTimelineWipe(database);
  const resetAssetCount = await resetLocalAssetsForRedetection(database);

  if (resetAssetCount === 0) {
    throw new Error('No saved photos to redetect yet.');
  }

  const petDetectionProgress = await processPendingPetCandidates({
    database,
    onProgress: onDetectingProgress,
  });

  return {
    resetAssetCount,
    petDetectionProgress,
    wipe,
  };
}
