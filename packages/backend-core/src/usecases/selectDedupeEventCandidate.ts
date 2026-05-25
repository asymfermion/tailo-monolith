export type DedupeEventCandidate = {
  eventId: string;
  timestamp: string;
  fingerprintMatchCount: number;
};

export const DEDUPE_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

export function selectDedupeEventCandidate(
  requestTimestamp: string,
  candidates: DedupeEventCandidate[],
): DedupeEventCandidate | null {
  const requestMs = Date.parse(requestTimestamp);

  if (!Number.isFinite(requestMs)) {
    return null;
  }

  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      distanceMs: Math.abs(Date.parse(candidate.timestamp) - requestMs),
    }))
    .filter((candidate) => candidate.distanceMs <= DEDUPE_TIMESTAMP_WINDOW_MS)
    .sort((left, right) => {
      if (right.fingerprintMatchCount !== left.fingerprintMatchCount) {
        return right.fingerprintMatchCount - left.fingerprintMatchCount;
      }

      return left.distanceMs - right.distanceMs;
    });

  return scored[0] ?? null;
}
