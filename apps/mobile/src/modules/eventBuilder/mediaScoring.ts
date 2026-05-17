import type { LocalAssetScoringInput } from '@/db/localAssets';
import type { NewLocalMediaScore } from '@/types';

const MIN_SELECTED_MEDIA = 2;
const MAX_SELECTED_MEDIA = 5;

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
  const rankedScores = assets
    .map((asset) =>
      scoreAsset({
        asset,
        localEventId,
        uniqueness: uniquenessByAssetId.get(asset.localAssetId) ?? 1,
      }),
    )
    .sort((left, right) => {
      if (right.overallScore !== left.overallScore) {
        return right.overallScore - left.overallScore;
      }

      return left.localAssetId.localeCompare(right.localAssetId);
    });
  const selectedCount = Math.min(MAX_SELECTED_MEDIA, rankedScores.length);
  const selectedScores = rankedScores.slice(0, selectedCount);
  const primaryAssetId = selectedScores[0]?.localAssetId ?? null;
  const selectedAssetIds = selectedScores.map((score) => score.localAssetId);
  const selectedAssetIdSet = new Set(selectedAssetIds);
  const scores = rankedScores.map((score) => ({
    ...score,
    isPrimary: score.localAssetId === primaryAssetId,
  }));

  return {
    scores,
    selectedAssetIds:
      selectedScores.length >= MIN_SELECTED_MEDIA
        ? selectedAssetIds
        : rankedScores
            .filter((score) => selectedAssetIdSet.has(score.localAssetId))
            .map((score) => score.localAssetId),
    primaryAssetId,
  };
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
