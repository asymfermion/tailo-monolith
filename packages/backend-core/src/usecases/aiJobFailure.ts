/** AI job retry policy (shared with Edge Function worker). */
export const AI_JOB_MAX_ATTEMPTS = 3;

export const AI_JOB_BACKOFF_MINUTES = [1, 5, 15] as const;

export function getAiJobBackoffIso(
  attemptCount: number,
  nowMs = Date.now(),
): string {
  const minutes =
    AI_JOB_BACKOFF_MINUTES[
      Math.min(attemptCount, AI_JOB_BACKOFF_MINUTES.length - 1)
    ] ?? 15;

  return new Date(nowMs + minutes * 60_000).toISOString();
}

export type AiJobFailureResolution =
  | { status: 'failed'; attemptCount: number }
  | { status: 'pending'; attemptCount: number; nextAttemptAt: string };

export function resolveAiJobFailure(
  currentAttemptCount: number,
  nowMs = Date.now(),
): AiJobFailureResolution {
  const nextAttempt = currentAttemptCount + 1;

  if (nextAttempt >= AI_JOB_MAX_ATTEMPTS) {
    return { status: 'failed', attemptCount: nextAttempt };
  }

  return {
    status: 'pending',
    attemptCount: nextAttempt,
    nextAttemptAt: getAiJobBackoffIso(nextAttempt, nowMs),
  };
}

/** Worker should not lease jobs scheduled in the future. */
export function isAiJobDue(nextAttemptAt: string, nowIso: string): boolean {
  return nextAttemptAt <= nowIso;
}
