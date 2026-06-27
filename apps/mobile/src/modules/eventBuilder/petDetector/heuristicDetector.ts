import type { PetDetector, PetDetectorInput, PetDetectorResult } from './types';

export const heuristicPetDetector: PetDetector = {
  detect: async (asset) => detectPetCandidate(asset),
};

/** Fallback only — never marks a photo as a pet (avoids fake timelines). */
export function detectPetCandidate(asset: PetDetectorInput): PetDetectorResult {
  const score = stablePhotoScore(asset);
  const confidence = Number((0.45 + score * 0.5).toFixed(2));

  return {
    isPetCandidate: false,
    detectedPetType: null,
    confidence,
    detectionSource: 'heuristic',
    detectionDebugLabel: 'heuristic_skip',
    detectedBreed: null,
  };
}

function stablePhotoScore(asset: PetDetectorInput): number {
  const ratio = asset.height === 0 ? 1 : asset.width / asset.height;
  const ratioScore = ratio > 0.65 && ratio < 1.9 ? 0.2 : 0;
  const hashScore = hashToUnit(
    `${asset.localAssetId}:${asset.uri}:${asset.createdAt}`,
  );

  return Math.min(1, hashScore * 0.8 + ratioScore);
}

function hashToUnit(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0xffffffff;
}
