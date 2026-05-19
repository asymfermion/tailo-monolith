import type { getDatabase } from '@/db';
import { getLocalAssetDetectionInputsForPromotedEvents } from '@/db/localAssets';
import {
  reconcilePromotedEventMediaForProfile,
  type ReconcilePromotedEventMediaResult,
} from '@/db/reconcilePromotedEventMedia';
import { pruneLocalTimelineForProfilePetType } from '@/db/localEvents';
import type { LocalPetType } from '@/modules/pets';

import {
  redetectLocalAssets,
  type RedetectLocalAssetsResult,
} from './petDetection';

export type RevalidatePromotedEventPetMediaResult = {
  redetectedCount: number;
  validForProfileCount: number;
  reconcile: ReconcilePromotedEventMediaResult;
  prune: {
    removedEventCount: number;
    removedScoreCount: number;
  };
};

export type RevalidatePromotedEventPetMediaOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  profilePetType: LocalPetType;
};

/**
 * Re-runs on-device pet detection for photos already attached to promoted
 * timeline events, then drops media (and empty events) that do not match the
 * profile pet type.
 */
export async function revalidatePromotedEventPetMedia({
  database,
  profilePetType,
}: RevalidatePromotedEventPetMediaOptions): Promise<RevalidatePromotedEventPetMediaResult | null> {
  const assets = await getLocalAssetDetectionInputsForPromotedEvents(database);

  if (assets.length === 0) {
    return null;
  }

  const redetect: RedetectLocalAssetsResult = await redetectLocalAssets({
    database,
    assets,
    profilePetType,
  });

  const reconcile = await reconcilePromotedEventMediaForProfile(
    database,
    profilePetType,
  );

  const prune = await pruneLocalTimelineForProfilePetType(
    database,
    profilePetType,
  );

  return {
    redetectedCount: redetect.redetectedCount,
    validForProfileCount: redetect.validForProfileCount,
    reconcile,
    prune,
  };
}
