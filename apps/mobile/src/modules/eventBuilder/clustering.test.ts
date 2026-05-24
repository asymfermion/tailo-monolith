import type { LocalPetCandidateAsset } from '@/db/localAssets';

import { buildEventCandidates, dedupeNearIdenticalAssets } from './clustering';

function asset(
  localAssetId: string,
  createdAt: string,
  petConfidence = 0.8,
  detectedPetType: LocalPetCandidateAsset['detectedPetType'] = 'dog',
): LocalPetCandidateAsset {
  return {
    localAssetId,
    createdAt,
    width: 1920,
    height: 1080,
    petConfidence,
    detectedPetType,
  };
}

describe('buildEventCandidates', () => {
  it('clusters same-day pet candidates within the time window', () => {
    const candidates = buildEventCandidates([
      asset('asset-1', '2026-05-17T03:30:00.000Z', 0.7),
      asset('asset-2', '2026-05-17T03:41:00.000Z', 0.9),
      asset('asset-3', '2026-05-18T08:00:00.000Z', 0.8),
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates[1]?.timestamp).toBe('2026-05-17T03:30:00.000Z');
    expect(candidates[1]?.selectedAssetIds).toEqual(['asset-2', 'asset-1']);
  });

  it('does not cluster candidates across different UTC days', () => {
    const candidates = buildEventCandidates(
      [
        asset('asset-1', '2026-05-17T23:55:00.000Z'),
        asset('asset-2', '2026-05-18T00:05:00.000Z'),
      ],
      { clusterWindowMinutes: 20 },
    );

    expect(candidates).toHaveLength(2);
  });

  it('keeps only the strongest auto-detected moment per UTC day per pet type', () => {
    const candidates = buildEventCandidates([
      asset('morning-1', '2026-05-17T03:30:00.000Z', 0.7),
      asset('morning-2', '2026-05-17T03:38:00.000Z', 0.75),
      asset('evening-1', '2026-05-17T18:00:00.000Z', 0.95),
      asset('evening-2', '2026-05-17T18:05:00.000Z', 0.85),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.timestamp).toBe('2026-05-17T18:00:00.000Z');
    expect(candidates[0]?.selectedAssetIds).toEqual(['evening-1', 'evening-2']);
  });

  it('allows one auto-detected moment per UTC day for each detected pet type', () => {
    const candidates = buildEventCandidates([
      asset('dog-1', '2026-05-17T03:30:00.000Z', 0.8, 'dog'),
      asset('cat-1', '2026-05-17T03:35:00.000Z', 0.8, 'cat'),
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.timestamp)).toEqual([
      '2026-05-17T03:35:00.000Z',
      '2026-05-17T03:30:00.000Z',
    ]);
  });

  it('creates stable event IDs for the same candidate group', () => {
    const assets = [
      asset('asset-1', '2026-05-17T03:30:00.000Z'),
      asset('asset-2', '2026-05-17T03:40:00.000Z'),
    ];

    expect(buildEventCandidates(assets)[0]?.localEventId).toBe(
      buildEventCandidates([...assets].reverse())[0]?.localEventId,
    );
  });
});

describe('dedupeNearIdenticalAssets', () => {
  it('drops near-identical assets using time and dimensions', () => {
    const dedupedAssets = dedupeNearIdenticalAssets([
      asset('asset-1', '2026-05-17T03:30:00.000Z'),
      asset('asset-2', '2026-05-17T03:30:01.000Z'),
      asset('asset-3', '2026-05-17T03:31:00.000Z'),
    ]);

    expect(dedupedAssets.map((item) => item.localAssetId)).toEqual([
      'asset-1',
      'asset-3',
    ]);
  });
});
