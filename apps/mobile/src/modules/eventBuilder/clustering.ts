import type { LocalPetCandidateAsset } from '@/db/localAssets';
import type { NewLocalEventCandidate } from '@/types';

const CLUSTER_WINDOW_MINUTES = 20;
const DEDUPE_WINDOW_SECONDS = 2;

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
      minutesBetween(clusterAnchor.createdAt, asset.createdAt) <=
        clusterWindowMinutes
    ) {
      currentCluster.push(asset);
    } else {
      clusters.push([asset]);
    }
  }

  return clusters
    .map(mapClusterToEventCandidate)
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() -
        new Date(left.timestamp).getTime(),
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
    selectedAssetIds,
  };
}

function createLocalEventId(timestamp: string, assetIds: string[]): string {
  const fingerprint = hashToBase36(`${timestamp}:${assetIds.join(',')}`);
  return `local-event-${timestamp.replaceAll(/[:.]/g, '-')}-${fingerprint}`;
}

function isSameUtcDay(left: string, right: string): boolean {
  return left.slice(0, 10) === right.slice(0, 10);
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
