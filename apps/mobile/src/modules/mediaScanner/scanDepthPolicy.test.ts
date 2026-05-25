import { shouldEnableHistoricalScan } from './scanDepthPolicy';

describe('shouldEnableHistoricalScan', () => {
  it('returns false for anonymous accounts', () => {
    expect(
      shouldEnableHistoricalScan({
        isLinkedAccount: false,
      }),
    ).toBe(false);
  });

  it('returns true for linked accounts', () => {
    expect(
      shouldEnableHistoricalScan({
        isLinkedAccount: true,
      }),
    ).toBe(true);
  });
});
