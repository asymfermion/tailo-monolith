export type ScanDepthPolicyInput = {
  isLinkedAccount: boolean;
};

/**
 * Linked accounts can run deeper historical scans; anonymous accounts stay
 * recent/incremental only.
 */
export function shouldEnableHistoricalScan(
  input: ScanDepthPolicyInput,
): boolean {
  return input.isLinkedAccount;
}
