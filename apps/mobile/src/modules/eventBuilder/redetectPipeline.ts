import type { getDatabase } from '@/db';
import { clearLocalEventPipeline } from '@/db/localEventCandidates';
import { resetLocalAssetsForRedetection } from '@/db/localAssets';

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
};

export async function redetectLocalPetPipeline({
  database,
  onDetectingProgress,
}: RedetectLocalPetPipelineOptions): Promise<RedetectLocalPetPipelineResult> {
  const resetAssetCount = await resetLocalAssetsForRedetection(database);

  if (resetAssetCount === 0) {
    throw new Error('No saved photos to redetect yet.');
  }

  await clearLocalEventPipeline(database);

  const petDetectionProgress = await processPendingPetCandidates({
    database,
    onProgress: onDetectingProgress,
  });

  return {
    resetAssetCount,
    petDetectionProgress,
  };
}
