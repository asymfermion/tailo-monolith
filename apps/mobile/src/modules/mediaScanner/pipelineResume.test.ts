import {
  hasIncompletePipelineWork,
  shouldStartInitialScan,
  type PipelineResumePlan,
} from './pipelineResume';

describe('pipelineResume helpers', () => {
  const basePlan: PipelineResumePlan = {
    phase: 'idle',
    shouldContinueRecentScan: false,
    scanAfter: null,
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
});
