import type { getDatabase } from '@/db';
import { logTailo } from '@/lib/tailoLogger';
import { clearScanSyncState, saveScanProgress, setPipelinePhase } from '@/db/syncState';

import {
  getQualifiedOnboardingMomentMaxByPetType,
  getOnboardingScanCreatedAfterMs,
  getPromotedMomentCount,
  ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
  ONBOARDING_SCAN_LIMITS,
  type OnboardingScanLimits,
} from './onboardingScanPolicy';
import { runPipelineProcessingStages, type LocalPipelineProgress } from './runLocalPipeline';
import { scanRecentPhotos } from './scanner';

export type RunOnboardingLocalPipelineOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  limits?: OnboardingScanLimits;
  progress?: LocalPipelineProgress;
};

export type OnboardingLocalPipelineResult = {
  totalScannedImages: number;
  promotedMomentCount: number;
  stoppedBecause: 'moments' | 'images' | 'window' | 'empty';
};

export async function runOnboardingLocalPipeline({
  database,
  limits = ONBOARDING_SCAN_LIMITS,
  progress,
}: RunOnboardingLocalPipelineOptions): Promise<OnboardingLocalPipelineResult> {
  const createdAfterMs = getOnboardingScanCreatedAfterMs(limits.windowDays);
  let totalScannedImages = 0;
  let resumeAfter: string | undefined;
  let stoppedBecause: OnboardingLocalPipelineResult['stoppedBecause'] =
    'window';

  await setPipelinePhase(database, 'scan');

  while (true) {
    const qualifiedMomentMaxByPetType =
      await getQualifiedOnboardingMomentMaxByPetType(database);
    if (qualifiedMomentMaxByPetType >= limits.targetMoments) {
      logTailo('Scan', 'Onboarding moment cap reached (quality-gated)', {
        qualifiedMomentMaxByPetType,
        targetMoments: limits.targetMoments,
        minPrimaryOverallScore: ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
      });
      stoppedBecause = 'moments';
      break;
    }

    const remainingImages = limits.maxImages - totalScannedImages;
    if (remainingImages <= 0) {
      stoppedBecause = 'images';
      break;
    }

    await saveScanProgress(database, {
      mode: 'recent',
      after: resumeAfter ?? null,
      hasNextPage: true,
      createdAfterMs,
    });

    const scanResult = await scanRecentPhotos({
      database,
      createdAfterMs,
      startAfter: resumeAfter,
      maxImages: remainingImages,
      maxPages: 1,
      onProgress: async (scanProgress) => {
        progress?.onScanProgress?.(scanProgress);
        await saveScanProgress(database, {
          mode: 'recent',
          after: scanProgress.endCursor ?? null,
          hasNextPage: scanProgress.hasNextPage,
          createdAfterMs,
        });
      },
    });

    totalScannedImages += scanResult.scannedCount;
    resumeAfter = scanResult.endCursor;

    if (scanResult.scannedCount === 0) {
      stoppedBecause = 'empty';
      break;
    }

    logTailo('Scan', 'Onboarding scan batch finished', {
      batchScannedCount: scanResult.scannedCount,
      totalScannedImages,
      hasNextPage: scanResult.hasNextPage,
      createdAfterMs,
      qualifiedMomentMaxByPetType,
      targetMoments: limits.targetMoments,
      minPrimaryOverallScore: ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
    });

    await runPipelineProcessingStages(database, progress);

    const qualifiedAfterProcessing =
      await getQualifiedOnboardingMomentMaxByPetType(database);
    if (qualifiedAfterProcessing >= limits.targetMoments) {
      logTailo(
        'Scan',
        'Onboarding moment cap reached after processing (quality-gated)',
        {
          qualifiedMomentMaxByPetType: qualifiedAfterProcessing,
          targetMoments: limits.targetMoments,
          minPrimaryOverallScore: ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
        },
      );
      stoppedBecause = 'moments';
      break;
    }

    if (totalScannedImages >= limits.maxImages) {
      stoppedBecause = 'images';
      break;
    }

    if (!scanResult.hasNextPage) {
      stoppedBecause = 'window';
      break;
    }
  }

  await clearScanSyncState(database);
  await setPipelinePhase(database, 'idle');

  const promotedMomentCount = await getPromotedMomentCount(database);

  logTailo('Scan', 'Onboarding scan finished', {
    totalScannedImages,
    promotedMomentCount,
    qualifiedMomentMaxByPetType:
      await getQualifiedOnboardingMomentMaxByPetType(database),
    minPrimaryOverallScore: ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
    stoppedBecause,
    limits,
  });

  return {
    totalScannedImages,
    promotedMomentCount,
    stoppedBecause,
  };
}
