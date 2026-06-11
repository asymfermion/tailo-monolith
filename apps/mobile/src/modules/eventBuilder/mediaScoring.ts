import type { LocalAssetScoringInput } from '@/db/localAssets';
import type { NewLocalMediaScore } from '@/types';

const MIN_SELECTED_MEDIA = 2;
const MAX_SELECTED_MEDIA = 5;
const NEAR_DUPLICATE_WINDOW_MS = 8_000;
const MIN_DIMENSION_SIMILARITY = 0.94;
const MAX_ASPECT_RATIO_DELTA = 0.05;

export type ScoreEventMediaOptions = {
  localEventId: string;
  assets: LocalAssetScoringInput[];
};

export type ScoreEventMediaResult = {
  scores: NewLocalMediaScore[];
  selectedAssetIds: string[];
  primaryAssetId: string | null;
};

export function scoreEventMedia({
  localEventId,
  assets,
}: ScoreEventMediaOptions): ScoreEventMediaResult {
  const uniquenessByAssetId = calculateUniquenessScores(assets);
  const rankedEntries = assets
    .map((asset) =>
      ({
        asset,
        score: scoreAsset({
          asset,
          localEventId,
          uniqueness: uniquenessByAssetId.get(asset.localAssetId) ?? 1,
        }),
      }) as const,
    )
    .sort((left, right) => {
      if (right.score.overallScore !== left.score.overallScore) {
        return right.score.overallScore - left.score.overallScore;
      }

      return left.score.localAssetId.localeCompare(right.score.localAssetId);
    });
  const selectedScores = selectDiverseScores(rankedEntries);
  const primaryAssetId = selectedScores[0]?.localAssetId ?? null;
  const selectedAssetIds = selectedScores.map((score) => score.localAssetId);
  const selectedAssetIdSet = new Set(selectedAssetIds);
  const scores = rankedEntries.map(({ score }) => ({
    ...score,
    isPrimary: score.localAssetId === primaryAssetId,
  }));

  return {
    scores,
    selectedAssetIds:
      selectedScores.length >= MIN_SELECTED_MEDIA
        ? selectedAssetIds
        : rankedEntries
            .map(({ score }) => score)
            .filter((score) => selectedAssetIdSet.has(score.localAssetId))
            .map((score) => score.localAssetId),
    primaryAssetId,
  };
}

function selectDiverseScores(
  rankedEntries: ReadonlyArray<{
    asset: LocalAssetScoringInput;
    score: NewLocalMediaScore;
  }>,
): NewLocalMediaScore[] {
  if (rankedEntries.length === 0) {
    return [];
  }

  const selected: Array<{
    asset: LocalAssetScoringInput;
    score: NewLocalMediaScore;
  }> = [];

  for (const entry of rankedEntries) {
    if (selected.length >= MAX_SELECTED_MEDIA) {
      break;
    }

    const isNearDuplicate = selected.some((kept) =>
      areNearDuplicatePose(entry.asset, kept.asset),
    );
    if (isNearDuplicate) {
      continue;
    }

    selected.push(entry);
  }

  // Preserve minimum coverage when most inputs are burst-like duplicates.
  const minRequired = Math.min(MIN_SELECTED_MEDIA, rankedEntries.length);
  if (selected.length < minRequired) {
    for (const entry of rankedEntries) {
      if (selected.length >= Math.min(MAX_SELECTED_MEDIA, minRequired)) {
        break;
      }

      if (
        selected.some(
          (kept) => kept.score.localAssetId === entry.score.localAssetId,
        )
      ) {
        continue;
      }

      selected.push(entry);
    }
  }

  return selected.map((entry) => entry.score);
}

function areNearDuplicatePose(
  left: LocalAssetScoringInput,
  right: LocalAssetScoringInput,
): boolean {
  const timeDistanceMs = Math.abs(
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  if (timeDistanceMs > NEAR_DUPLICATE_WINDOW_MS) {
    return false;
  }

  const leftAspect = left.height === 0 ? 1 : left.width / left.height;
  const rightAspect = right.height === 0 ? 1 : right.width / right.height;
  const aspectDelta = Math.abs(leftAspect - rightAspect);
  if (aspectDelta > MAX_ASPECT_RATIO_DELTA) {
    return false;
  }

  const widthSimilarity =
    Math.min(left.width, right.width) / Math.max(left.width, right.width);
  const heightSimilarity =
    Math.min(left.height, right.height) / Math.max(left.height, right.height);

  return (
    widthSimilarity >= MIN_DIMENSION_SIMILARITY &&
    heightSimilarity >= MIN_DIMENSION_SIMILARITY
  );
}

function scoreAsset({
  asset,
  localEventId,
  uniqueness,
}: {
  asset: LocalAssetScoringInput;
  localEventId: string;
  uniqueness: number;
}): NewLocalMediaScore {
  const sharpness = stableRangeScore(
    `${asset.localAssetId}:sharpness`,
    0.45,
    1,
  );
  const brightness = calculateBrightnessScore(asset);
  const subjectVisibility = clamp(asset.petConfidence);
  const overallScore = roundScore(
    sharpness * 0.3 +
      brightness * 0.2 +
      subjectVisibility * 0.35 +
      uniqueness * 0.15,
  );

  return {
    localAssetId: asset.localAssetId,
    localEventId,
    sharpness,
    brightness,
    subjectVisibility,
    uniqueness,
    overallScore,
  };
}

function calculateBrightnessScore(asset: LocalAssetScoringInput): number {
  const aspectRatio = asset.height === 0 ? 1 : asset.width / asset.height;
  const aspectBalance = 1 - Math.min(Math.abs(aspectRatio - 1.33), 1);
  const hashScore = stableRangeScore(
    `${asset.localAssetId}:brightness`,
    0.35,
    1,
  );

  return roundScore(hashScore * 0.75 + aspectBalance * 0.25);
}

function calculateUniquenessScores(
  assets: LocalAssetScoringInput[],
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const asset of assets) {
    const closestNeighborMs = assets.reduce<number | null>((closest, other) => {
      if (other.localAssetId === asset.localAssetId) {
        return closest;
      }

      const distance = Math.abs(
        new Date(other.createdAt).getTime() -
          new Date(asset.createdAt).getTime(),
      );

      return closest === null ? distance : Math.min(closest, distance);
    }, null);

    if (closestNeighborMs === null) {
      scores.set(asset.localAssetId, 1);
    } else {
      scores.set(
        asset.localAssetId,
        roundScore(Math.min(1, closestNeighborMs / (5 * 60 * 1000))),
      );
    }
  }

  return scores;
}

function stableRangeScore(value: string, min: number, max: number): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const unit = (hash >>> 0) / 0xffffffff;
  return roundScore(min + unit * (max - min));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Number(value.toFixed(3));
}
