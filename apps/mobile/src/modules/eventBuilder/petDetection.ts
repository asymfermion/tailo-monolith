import type { getDatabase } from '@/db';
import {
  countLocalPetCandidates,
  countPendingLocalAssetsForDetection,
  getPendingLocalAssetsForDetection,
  updateLocalAssetDetectionResults,
} from '@/db/localAssets';

import { isPetCandidateForProfile, loadLocalPetProfile } from '@/modules/pets';

import {
  createPetDetector,
  heuristicPetDetector,
  type PetDetector,
} from './petDetector';
import type {
  DetectionSource,
  PetDetectorInput,
  PetDetectorResult,
} from './petDetector/types';

const DETECTION_BATCH_SIZE = 25;
const DETECTION_TIMEOUT_MS = 12_000;

export type PetDetectionProgress = {
  batchCount: number;
  processedCount: number;
  totalCount: number;
  petCandidateCount: number;
  hasMore: boolean;
};

export type ProcessPendingPetCandidatesOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  batchSize?: number;
  detectionTimeoutMs?: number;
  detector?: PetDetector;
  onProgress?: (progress: PetDetectionProgress) => void;
};

export async function processPendingPetCandidates({
  database,
  batchSize = DETECTION_BATCH_SIZE,
  detectionTimeoutMs = DETECTION_TIMEOUT_MS,
  detector = createPetDetector(),
  onProgress,
}: ProcessPendingPetCandidatesOptions): Promise<PetDetectionProgress> {
  const profile = await loadLocalPetProfile();
  const profilePetType = profile?.type ?? null;
  let batchCount = 0;
  let processedCount = 0;
  const totalCount = await countPendingLocalAssetsForDetection(database);
  let hasMore = totalCount > 0;

  while (hasMore) {
    const assets = await getPendingLocalAssetsForDetection(database, batchSize);

    if (assets.length === 0) {
      hasMore = false;
      break;
    }

    batchCount += 1;

    for (const asset of assets) {
      const result = await detectAssetWithTimeout(
        asset,
        detector,
        detectionTimeoutMs,
      );

      await updateLocalAssetDetectionResults(database, [
        {
          localAssetId: asset.localAssetId,
          isPetCandidate: isPetCandidateForProfile(
            result.isPetCandidate,
            result.detectedPetType,
            profilePetType,
          ),
          petConfidence: result.confidence,
          detectedPetType: result.detectedPetType,
          detectionSource: result.detectionSource,
          detectionDebugLabel: result.detectionDebugLabel,
        },
      ]);

      processedCount += 1;
      const petCandidateCount = await countLocalPetCandidates(
        database,
        profilePetType,
      );
      hasMore = processedCount < totalCount;

      onProgress?.({
        batchCount,
        processedCount,
        totalCount,
        petCandidateCount,
        hasMore,
      });

      await yieldToUi();
    }
  }

  const petCandidateCount = await countLocalPetCandidates(
    database,
    profilePetType,
  );

  return {
    batchCount,
    processedCount,
    totalCount,
    petCandidateCount,
    hasMore: false,
  };
}

async function detectAssetWithTimeout(
  asset: PetDetectorInput,
  detector: PetDetector,
  timeoutMs: number,
): Promise<PetDetectorResult> {
  try {
    return await withTimeout(detector.detect(asset), timeoutMs, () => {
      throw new Error(`Pet detection timed out for ${asset.localAssetId}`);
    });
  } catch {
    const result = await heuristicPetDetector.detect(asset);
    return {
      ...result,
      detectionSource: 'timeout_heuristic' satisfies DetectionSource,
    };
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        onTimeout();
      } catch (error) {
        reject(error);
      }
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
