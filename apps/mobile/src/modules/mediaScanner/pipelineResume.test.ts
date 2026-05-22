import {
  hasIncompletePipelineWork,
  shouldRunIncrementalScan,
  shouldStartInitialScan,
  type PipelineResumePlan,
} from './pipelineResume';

describe('pipelineResume helpers', () => {
  const basePlan: PipelineResumePlan = {
    phase: 'idle',
    shouldContinueRecentScan: false,
    scanAfter: null,
    scanCreatedAfterMs: null,
    pendingDetectionCount: 0,
    scorableCandidateCount: 0,
    promotableCandidateCount: 0,
    pendingUploadCount: 0,
    hasLocalAssets: false,
  };

  it('detects incomplete scan and processing work', () => {
    expect(
      hasIncompletePipelineWork({
        ...basePlan,
        shouldContinueRecentScan: true,
      }),
    ).toBe(true);
    expect(
      hasIncompletePipelineWork({
        ...basePlan,
        pendingDetectionCount: 3,
      }),
    ).toBe(true);
    expect(
      hasIncompletePipelineWork({
        ...basePlan,
        promotableCandidateCount: 1,
      }),
    ).toBe(true);
  });

  it('starts an initial scan only when the library is empty', () => {
    expect(shouldStartInitialScan(basePlan)).toBe(true);
    expect(
      shouldStartInitialScan({
        ...basePlan,
        hasLocalAssets: true,
      }),
    ).toBe(false);
  });

  it('runs an incremental scan when assets exist and the pipeline is idle', () => {
    expect(
      shouldRunIncrementalScan({
        ...basePlan,
        hasLocalAssets: true,
      }),
    ).toBe(true);
    expect(shouldRunIncrementalScan(basePlan)).toBe(false);
    expect(
      shouldRunIncrementalScan({
        ...basePlan,
        hasLocalAssets: true,
        pendingDetectionCount: 2,
        promotableCandidateCount: 3,
      }),
    ).toBe(true);
    expect(
      shouldRunIncrementalScan({
        ...basePlan,
        hasLocalAssets: true,
        shouldContinueRecentScan: true,
      }),
    ).toBe(false);
  });
});
