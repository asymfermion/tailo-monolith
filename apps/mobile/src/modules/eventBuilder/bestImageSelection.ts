import type { getDatabase } from '@/db';
import {
  getScorableLocalEventCandidates,
  updateLocalEventCandidateSelection,
} from '@/db/localEventCandidates';
import { getLocalAssetsByIds } from '@/db/localAssets';
import { upsertLocalMediaScores } from '@/db/localMediaScores';

import { scoreEventMedia } from './mediaScoring';

export type BestImageSelectionProgress = {
  eventCount: number;
  scoredAssetCount: number;
  selectedAssetCount: number;
};

export type SelectBestEventImagesOptions = {
  database: Awaited<ReturnType<typeof getDatabase>>;
  onProgress?: (progress: BestImageSelectionProgress) => void;
};

export async function selectBestEventImages({
  database,
  onProgress,
}: SelectBestEventImagesOptions): Promise<BestImageSelectionProgress> {
  const candidates = await getScorableLocalEventCandidates(database);
  let scoredAssetCount = 0;
  let selectedAssetCount = 0;

  for (const candidate of candidates) {
    const assetIds = parseSelectedAssetIds(candidate.selectedAssetIds);
    const assets = await getLocalAssetsByIds(database, assetIds);
    const result = scoreEventMedia({
      localEventId: candidate.localEventId,
      assets: orderAssetsByIds(assets, assetIds),
    });

    await upsertLocalMediaScores(database, result.scores);
    await updateLocalEventCandidateSelection(
      database,
      candidate.localEventId,
      result.selectedAssetIds,
      'scored',
    );

    scoredAssetCount += result.scores.length;
    selectedAssetCount += result.selectedAssetIds.length;

    onProgress?.({
      eventCount: candidates.length,
      scoredAssetCount,
      selectedAssetCount,
    });
  }

  return {
    eventCount: candidates.length,
    scoredAssetCount,
    selectedAssetCount,
  };
}

function parseSelectedAssetIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function orderAssetsByIds<T extends { localAssetId: string }>(
  assets: T[],
  assetIds: string[],
): T[] {
  const orderById = new Map(assetIds.map((assetId, index) => [assetId, index]));

  return [...assets].sort(
    (left, right) =>
      (orderById.get(left.localAssetId) ?? Number.MAX_SAFE_INTEGER) -
      (orderById.get(right.localAssetId) ?? Number.MAX_SAFE_INTEGER),
  );
}
