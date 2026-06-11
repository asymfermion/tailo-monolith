import type { getDatabase } from '@/db';
import {
  getLocalEventCount,
  getMaxQualifiedLocalEventCountByDetectedPetType,
  getQualifiedLocalEventCountByDetectedPetType,
} from '@/db/localEvents';
import type { LocalPetType } from '@/modules/pets/petProfile';

/** Onboarding scans stop at the first limit hit: moments, images, or window. */
export const ONBOARDING_SCAN_WINDOW_DAYS = 90;
export const ONBOARDING_SCAN_MAX_IMAGES = 500;
export const ONBOARDING_SCAN_TARGET_MOMENTS = 10;
export const ONBOARDING_MIN_PRIMARY_OVERALL_SCORE = 0.5;

export type OnboardingScanLimits = {
  windowDays: number;
  maxImages: number;
  targetMoments: number;
};

export const ONBOARDING_SCAN_LIMITS: OnboardingScanLimits = {
  windowDays: ONBOARDING_SCAN_WINDOW_DAYS,
  maxImages: ONBOARDING_SCAN_MAX_IMAGES,
  targetMoments: ONBOARDING_SCAN_TARGET_MOMENTS,
};

export async function getPromotedMomentCount(
  database: Awaited<ReturnType<typeof getDatabase>>,
): Promise<number> {
  return getLocalEventCount(database);
}

export async function hasReachedOnboardingMomentTarget(
  database: Awaited<ReturnType<typeof getDatabase>>,
  targetMoments: number = ONBOARDING_SCAN_TARGET_MOMENTS,
): Promise<boolean> {
  return (
    (await getMaxQualifiedLocalEventCountByDetectedPetType(
      database,
      ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
    )) >= targetMoments
  );
}

export async function getQualifiedOnboardingMomentMaxByPetType(
  database: Awaited<ReturnType<typeof getDatabase>>,
): Promise<number> {
  return getMaxQualifiedLocalEventCountByDetectedPetType(
    database,
    ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
  );
}

export async function hasReachedOnboardingMomentTargetForPetType(
  database: Awaited<ReturnType<typeof getDatabase>>,
  petType: LocalPetType,
  targetMoments: number = ONBOARDING_SCAN_TARGET_MOMENTS,
): Promise<boolean> {
  return (
    (await getQualifiedLocalEventCountByDetectedPetType(
      database,
      petType,
      ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
    )) >=
    targetMoments
  );
}

export async function getQualifiedOnboardingMomentCountForPetType(
  database: Awaited<ReturnType<typeof getDatabase>>,
  petType: LocalPetType,
): Promise<number> {
  return getQualifiedLocalEventCountByDetectedPetType(
    database,
    petType,
    ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
  );
}

export function getOnboardingScanCreatedAfterMs(
  windowDays: number = ONBOARDING_SCAN_WINDOW_DAYS,
  nowMs: number = Date.now(),
): number {
  return nowMs - windowDays * 24 * 60 * 60 * 1000;
}
