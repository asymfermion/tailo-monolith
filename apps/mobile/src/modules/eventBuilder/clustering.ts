import type { LocalPetCandidateAsset } from '@/db/localAssets';
import type { NewLocalEventCandidate } from '@/types';

const CLUSTER_WINDOW_MINUTES = 20;
const DEDUPE_WINDOW_SECONDS = 2;
const MAX_AUTO_DETECTED_MOMENTS_PER_DAY_PER_PET = 1;

export type BuildEventCandidatesOptions = {
  clusterWindowMinutes?: number;
};

export function buildEventCandidates(
  assets: LocalPetCandidateAsset[],
  {
    clusterWindowMinutes = CLUSTER_WINDOW_MINUTES,
  }: BuildEventCandidatesOptions = {},
): NewLocalEventCandidate[] {
  const dedupedAssets = dedupeNearIdenticalAssets(assets);
  const sortedAssets = [...dedupedAssets].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  const clusters: LocalPetCandidateAsset[][] = [];

  for (const asset of sortedAssets) {
    const currentCluster = clusters.at(-1);
    const clusterAnchor = currentCluster?.[0];

    if (
      currentCluster &&
      clusterAnchor &&
      isSameUtcDay(clusterAnchor.createdAt, asset.createdAt) &&
      isSameDetectedPetType(clusterAnchor, asset) &&
      minutesBetween(clusterAnchor.createdAt, asset.createdAt) <=
        clusterWindowMinutes
    ) {
      currentCluster.push(asset);
    } else {
      clusters.push([asset]);
    }
  }

  return limitAutoDetectedMomentsPerDayPerPet(clusters)
    .map(mapClusterToEventCandidate)
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() -
        new Date(left.timestamp).getTime(),
    );
}

function limitAutoDetectedMomentsPerDayPerPet(
  clusters: LocalPetCandidateAsset[][],
): LocalPetCandidateAsset[][] {
  const bestClusterByDayAndPet = new Map<string, LocalPetCandidateAsset[]>();

  for (const cluster of clusters) {
    const key = getDayAndPetKey(cluster);
    const existingCluster = bestClusterByDayAndPet.get(key);

    if (
      !existingCluster ||
      compareClusterQuality(cluster, existingCluster) > 0
    ) {
      bestClusterByDayAndPet.set(key, cluster);
    }
  }

  return Array.from(bestClusterByDayAndPet.values()).slice(
    0,
    clusters.length * MAX_AUTO_DETECTED_MOMENTS_PER_DAY_PER_PET,
  );
}

export function dedupeNearIdenticalAssets(
  assets: LocalPetCandidateAsset[],
): LocalPetCandidateAsset[] {
  const sortedAssets = [...assets].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  const keptAssets: LocalPetCandidateAsset[] = [];

  for (const asset of sortedAssets) {
    const duplicate = keptAssets.some(
      (keptAsset) =>
        keptAsset.width === asset.width &&
        keptAsset.height === asset.height &&
        Math.abs(
          new Date(keptAsset.createdAt).getTime() -
            new Date(asset.createdAt).getTime(),
        ) <=
          DEDUPE_WINDOW_SECONDS * 1000,
    );

    if (!duplicate) {
      keptAssets.push(asset);
    }
  }

  return keptAssets;
}

function mapClusterToEventCandidate(
  cluster: LocalPetCandidateAsset[],
): NewLocalEventCandidate {
  const sortedByConfidence = [...cluster].sort((left, right) => {
    if (right.petConfidence !== left.petConfidence) {
      return right.petConfidence - left.petConfidence;
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  });
  const selectedAssetIds = sortedByConfidence.map(
    (asset) => asset.localAssetId,
  );
  const timestamp = cluster[0]?.createdAt ?? new Date(0).toISOString();

  return {
    localEventId: createLocalEventId(timestamp, selectedAssetIds),
    timestamp,
    source: 'camera_roll',
    candidateStatus: 'pending',
    processingState: 'pending',
    selectedAssetIds,
  };
}

function getDayAndPetKey(cluster: LocalPetCandidateAsset[]): string {
  const firstAsset = cluster[0];
  const day = firstAsset?.createdAt.slice(0, 10) ?? 'unknown-day';
  const petType = getClusterPetType(cluster);

  return `${day}:${petType}`;
}

function getClusterPetType(cluster: LocalPetCandidateAsset[]): string {
  return (
    [...cluster].sort((left, right) => {
      if (right.petConfidence !== left.petConfidence) {
        return right.petConfidence - left.petConfidence;
      }

      return (
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      );
    })[0]?.detectedPetType ?? 'unknown'
  );
}

function compareClusterQuality(
  left: LocalPetCandidateAsset[],
  right: LocalPetCandidateAsset[],
): number {
  const leftScore = getClusterQuality(left);
  const rightScore = getClusterQuality(right);

  if (leftScore !== rightScore) {
    return leftScore - rightScore;
  }

  if (left.length !== right.length) {
    return left.length - right.length;
  }

  return getClusterTimestampMs(left) - getClusterTimestampMs(right);
}

function getClusterQuality(cluster: LocalPetCandidateAsset[]): number {
  return Math.max(...cluster.map((asset) => asset.petConfidence));
}

function getClusterTimestampMs(cluster: LocalPetCandidateAsset[]): number {
  return new Date(cluster[0]?.createdAt ?? 0).getTime();
}

function createLocalEventId(timestamp: string, assetIds: string[]): string {
  const fingerprint = hashToBase36(`${timestamp}:${assetIds.join(',')}`);
  return `local-event-${timestamp.replaceAll(/[:.]/g, '-')}-${fingerprint}`;
}

function isSameUtcDay(left: string, right: string): boolean {
  return left.slice(0, 10) === right.slice(0, 10);
}

function isSameDetectedPetType(
  left: LocalPetCandidateAsset,
  right: LocalPetCandidateAsset,
): boolean {
  return left.detectedPetType === right.detectedPetType;
}

function minutesBetween(left: string, right: string): number {
  return Math.abs(new Date(right).getTime() - new Date(left).getTime()) / 60000;
}

function hashToBase36(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
