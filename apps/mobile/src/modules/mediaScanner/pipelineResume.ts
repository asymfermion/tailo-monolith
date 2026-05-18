import type * as SQLite from 'expo-sqlite';

import { getPromotableEventCandidates } from '@/db/localEvents';
import {
  countPendingLocalAssetsForDetection,
  countLocalAssets,
} from '@/db/localAssets';
import { getScorableLocalEventCandidates } from '@/db/localEventCandidates';
import { countPendingUploadQueueItems } from '@/db/uploadQueue';
import {
  getPipelinePhase,
  getScanProgress,
  type PipelinePhase,
} from '@/db/syncState';

export type PipelineResumePlan = {
  phase: PipelinePhase;
  shouldContinueRecentScan: boolean;
  scanAfter: string | null;
  pendingDetectionCount: number;
  scorableCandidateCount: number;
  promotableCandidateCount: number;
  pendingUploadCount: number;
  hasLocalAssets: boolean;
};

export async function getPipelineResumePlan(
  database: SQLite.SQLiteDatabase,
): Promise<PipelineResumePlan> {
  const phase = await getPipelinePhase(database);
  const scanProgress = await getScanProgress(database);
  const pendingDetectionCount =
    await countPendingLocalAssetsForDetection(database);
  const scorableCandidates = await getScorableLocalEventCandidates(database);
  const promotableCandidates = await getPromotableEventCandidates(database);
  const pendingUploadCount = await countPendingUploadQueueItems(database);
  const assetCount = await countLocalAssets(database);
  const hasLocalAssets = assetCount > 0;

  const shouldContinueRecentScan =
    scanProgress.mode === 'recent' && scanProgress.hasNextPage;

  return {
    phase,
    shouldContinueRecentScan,
    scanAfter: scanProgress.after,
    pendingDetectionCount,
    scorableCandidateCount: scorableCandidates.length,
    promotableCandidateCount: promotableCandidates.length,
    pendingUploadCount,
    hasLocalAssets,
  };
}

export function hasIncompletePipelineWork(plan: PipelineResumePlan): boolean {
  if (plan.shouldContinueRecentScan) {
    return true;
  }

  if (plan.phase !== 'idle') {
    return true;
  }

  return (
    plan.pendingDetectionCount > 0 ||
    plan.scorableCandidateCount > 0 ||
    plan.promotableCandidateCount > 0
  );
}

export function shouldStartInitialScan(plan: PipelineResumePlan): boolean {
  return !plan.hasLocalAssets && !hasIncompletePipelineWork(plan);
}
