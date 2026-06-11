import type { getDatabase } from '@/db';
import { logTailo } from '@/lib/tailoLogger';
import { pruneLocalTimelineForProfilePetType } from '@/db/localEvents';
import { reapplyPetCandidateFlagsForProfile } from '@/db/localAssets';
import {
  clearScanSyncState,
  saveScanProgress,
  setPipelinePhase,
} from '@/db/syncState';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';
import {
  promoteScoredCandidatesToLocalEvents,
  selectBestEventImages,
  type BestImageSelectionProgress,
  clusterLocalPetEvents,
  type EventClusteringProgress,
  processPendingPetCandidates,
  type PetDetectionProgress,
} from '@/modules/eventBuilder';

import type { PipelineResumePlan } from './pipelineResume';
import {
  scanOlderPhotos,
  scanRecentPhotos,
  type ScanProgress,
} from './scanner';

export type LocalPipelineProgress = {
  onScanProgress?: (progress: ScanProgress) => void;
  onDetectingProgress?: (progress: PetDetectionProgress) => void;
  onClusteringProgress?: (progress: EventClusteringProgress) => void;
  onSelectingProgress?: (progress: BestImageSelectionProgress) => void;
};

export type RunLocalPipelineOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  includeRecentScan?: boolean;
  resumeRecentScanAfter?: string | null;
  /** When set, recent scan only ingests photos newer than this time. */
  scanCreatedAfterMs?: number | null;
  includeOlderScan?: boolean;
  progress?: LocalPipelineProgress;
};

export async function runLocalPipeline({
  database,
  includeRecentScan = false,
  resumeRecentScanAfter = null,
  scanCreatedAfterMs = null,
  includeOlderScan = false,
  progress,
}: RunLocalPipelineOptions): Promise<void> {
  if (includeRecentScan) {
    await setPipelinePhase(database, 'scan');
    await saveScanProgress(database, {
      mode: 'recent',
      after: resumeRecentScanAfter,
      hasNextPage: true,
      createdAfterMs: scanCreatedAfterMs,
    });

    const scanResult = await scanRecentPhotos({
      database,
      createdAfterMs: scanCreatedAfterMs,
      startAfter: resumeRecentScanAfter ?? undefined,
      onProgress: async (scanProgress) => {
        progress?.onScanProgress?.(scanProgress);
        await saveScanProgress(database, {
          mode: 'recent',
          after: scanProgress.endCursor ?? null,
          hasNextPage: scanProgress.hasNextPage,
          createdAfterMs: scanCreatedAfterMs,
        });
      },
    });

    logTailo('Scan', 'Photo library scan phase finished', {
      scannedCount: scanResult.scannedCount,
      persistedCount: scanResult.persistedCount,
      batchCount: scanResult.batchCount,
      hasNextPage: scanResult.hasNextPage,
      scanMode: scanCreatedAfterMs != null ? 'incremental' : 'initial_window',
      createdAfterMs: scanCreatedAfterMs,
    });

    if (!scanResult.hasNextPage) {
      await clearScanSyncState(database);
    }
  }

  await runPipelineProcessingStages(database, progress);

  if (includeOlderScan) {
    void continueOlderPhotoPipeline(database).catch(() => undefined);
  }
}

export async function resumeLocalPipeline({
  database,
  plan,
  progress,
}: {
  database: Awaited<ReturnType<typeof getDatabase>>;
  plan: PipelineResumePlan;
  progress?: LocalPipelineProgress;
}): Promise<void> {
  if (plan.shouldContinueRecentScan) {
    await runLocalPipeline({
      database,
      includeRecentScan: true,
      resumeRecentScanAfter: plan.scanAfter,
      scanCreatedAfterMs: plan.scanCreatedAfterMs,
      progress,
    });
    return;
  }

  if (plan.pendingDetectionCount > 0 || plan.phase === 'detect') {
    await setPipelinePhase(database, 'detect');
    await processPendingPetCandidates({
      database,
      onProgress: progress?.onDetectingProgress,
    });
  }

  if (plan.scorableCandidateCount > 0) {
    await setPipelinePhase(database, 'select');
    await selectBestEventImages({
      database,
      onProgress: progress?.onSelectingProgress,
    });
  } else if (
    plan.phase === 'cluster' ||
    plan.phase === 'select' ||
    plan.pendingDetectionCount > 0
  ) {
    await setPipelinePhase(database, 'cluster');
    await clusterLocalPetEvents({
      database,
      onProgress: progress?.onClusteringProgress,
    });
    await setPipelinePhase(database, 'select');
    await selectBestEventImages({
      database,
      onProgress: progress?.onSelectingProgress,
    });
  }

  if (plan.promotableCandidateCount > 0 || plan.phase === 'promote') {
    await setPipelinePhase(database, 'promote');
    await promoteScoredCandidatesToLocalEvents({ database });
  }

  await setPipelinePhase(database, 'idle');
}

export async function runPipelineProcessingStages(
  database: Awaited<ReturnType<typeof getDatabase>>,
  progress?: LocalPipelineProgress,
): Promise<void> {
  await setPipelinePhase(database, 'detect');
  const detection = await processPendingPetCandidates({
    database,
    onProgress: progress?.onDetectingProgress,
  });

  if (detection.processedCount > 0) {
    logTailo('Detect', 'Pet detection pass finished', {
      processedCount: detection.processedCount,
      petCandidateCount: detection.petCandidateCount,
    });
  }

  await setPipelinePhase(database, 'cluster');
  const clustering = await clusterLocalPetEvents({
    database,
    onProgress: progress?.onClusteringProgress,
  });

  if (clustering.eventCandidateCount > 0) {
    logTailo('Cluster', 'Event clustering pass finished', {
      petCandidateCount: clustering.petCandidateCount,
      eventCandidateCount: clustering.eventCandidateCount,
      persistedCount: clustering.persistedCount,
    });
  }

  await setPipelinePhase(database, 'select');
  const selection = await selectBestEventImages({
    database,
    onProgress: progress?.onSelectingProgress,
  });

  if (selection.scoredAssetCount > 0) {
    logTailo('Pipeline', 'Best-image selection pass finished', {
      eventCount: selection.eventCount,
      scoredAssetCount: selection.scoredAssetCount,
      selectedAssetCount: selection.selectedAssetCount,
    });
  }

  await setPipelinePhase(database, 'promote');
  const promotion = await promoteScoredCandidatesToLocalEvents({ database });

  if (promotion.promotedCount > 0) {
    logTailo('Promote', 'New timeline moments promoted locally', {
      promotedCount: promotion.promotedCount,
      candidateCount: promotion.candidateCount,
    });
  }

  await setPipelinePhase(database, 'idle');
}

async function continueOlderPhotoPipeline(
  database: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  const profilePetType = (await loadLocalPetProfile())?.type ?? null;

  await scanOlderPhotos({ database });

  if (profilePetType) {
    await reapplyPetCandidateFlagsForProfile(database, profilePetType);
  }

  await processPendingPetCandidates({ database });
  await clusterLocalPetEvents({ database, profilePetType });
  await selectBestEventImages({ database });
  await promoteScoredCandidatesToLocalEvents({ database });

  if (profilePetType) {
    await pruneLocalTimelineForProfilePetType(database, profilePetType);
  }
}
