import { countLocalAssetsCreatedAfter } from '@/db/localAssets';
import { logTailo } from '@/lib/tailoLogger';
import type { LocalPetType } from '@/modules/pets/petProfile';

import {
  getOnboardingScanCreatedAfterMs,
  hasReachedOnboardingMomentTargetForPetType,
  ONBOARDING_SCAN_LIMITS,
  type OnboardingScanLimits,
} from './onboardingScanPolicy';
import { runPipelineProcessingStages } from './runLocalPipeline';
import { scanRecentPhotos } from './scanner';
import { getDatabase } from '@/db';

/**
 * Quietly extends onboarding scan after pet selection so the chosen pet type
 * can reach the target moment count without blocking profile entry.
 */
export async function runOnboardingPetTypeTopUp({
  petType,
  limits = ONBOARDING_SCAN_LIMITS,
}: {
  petType: LocalPetType;
  limits?: OnboardingScanLimits;
}): Promise<void> {
  const database = await getDatabase();
  const createdAfterMs = getOnboardingScanCreatedAfterMs(limits.windowDays);
  const existingScanned = await countLocalAssetsCreatedAfter(
    database,
    createdAfterMs,
  );

  if (existingScanned >= limits.maxImages) {
    return;
  }

  if (
    await hasReachedOnboardingMomentTargetForPetType(
      database,
      petType,
      limits.targetMoments,
    )
  ) {
    return;
  }

  let after: string | undefined;
  let traversedImages = 0;

  logTailo('Scan', 'Starting quiet onboarding top-up for selected pet type', {
    petType,
    limits,
    existingScanned,
  });

  while (traversedImages < limits.maxImages) {
    const result = await scanRecentPhotos({
      database,
      createdAfterMs,
      startAfter: after,
      maxImages: Math.min(50, limits.maxImages - traversedImages),
      maxPages: 1,
    });

    if (result.scannedCount === 0) {
      break;
    }

    traversedImages += result.scannedCount;
    after = result.endCursor;

    await runPipelineProcessingStages(database);

    if (
      await hasReachedOnboardingMomentTargetForPetType(
        database,
        petType,
        limits.targetMoments,
      )
    ) {
      break;
    }

    if (!result.hasNextPage) {
      break;
    }
  }

  logTailo('Scan', 'Finished quiet onboarding top-up for selected pet type', {
    petType,
    traversedImages,
  });
}
