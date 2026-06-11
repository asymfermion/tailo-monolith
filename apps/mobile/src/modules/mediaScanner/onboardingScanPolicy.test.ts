import {
  getOnboardingScanCreatedAfterMs,
  ONBOARDING_SCAN_LIMITS,
  ONBOARDING_SCAN_MAX_IMAGES,
  ONBOARDING_MIN_PRIMARY_OVERALL_SCORE,
  ONBOARDING_SCAN_TARGET_MOMENTS,
  ONBOARDING_SCAN_WINDOW_DAYS,
} from './onboardingScanPolicy';

describe('onboardingScanPolicy', () => {
  it('uses the onboarding scan limits agreed for first-session value', () => {
    expect(ONBOARDING_SCAN_WINDOW_DAYS).toBe(90);
    expect(ONBOARDING_SCAN_MAX_IMAGES).toBe(500);
    expect(ONBOARDING_SCAN_TARGET_MOMENTS).toBe(10);
    expect(ONBOARDING_MIN_PRIMARY_OVERALL_SCORE).toBe(0.5);
    expect(ONBOARDING_SCAN_LIMITS).toEqual({
      windowDays: 90,
      maxImages: 500,
      targetMoments: 10,
    });
  });

  it('computes the created-after timestamp from the onboarding window', () => {
    const nowMs = Date.UTC(2026, 5, 10, 12, 0, 0);
    const createdAfterMs = getOnboardingScanCreatedAfterMs(90, nowMs);

    expect(createdAfterMs).toBe(nowMs - 90 * 24 * 60 * 60 * 1000);
  });
});
