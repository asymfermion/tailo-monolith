/** Default lease duration for `ai_jobs` while `status = processing`. */
export const AI_JOB_LEASE_SECONDS = 120;

export const SWEEP_MAX_JOBS_DEFAULT = 5;
export const SWEEP_MAX_JOBS_CAP = 10;

export type ProcessAiJobInvokeRequest = {
  sweep: boolean;
  maxJobs: number;
};

/**
 * Stuck workers: `processing` past `leased_until`, or `processing` with no lease timestamp.
 */
export function shouldReleaseAiJobLease(input: {
  status: string;
  leasedUntil: string | null;
  nowIso: string;
}): boolean {
  if (input.status !== 'processing') {
    return false;
  }

  if (input.leasedUntil === null) {
    return true;
  }

  return input.leasedUntil < input.nowIso;
}

export function parseProcessAiJobInvokeRequest(
  body: unknown,
): ProcessAiJobInvokeRequest {
  if (!body || typeof body !== 'object') {
    return { sweep: false, maxJobs: 1 };
  }

  const sweep = Reflect.get(body, 'sweep') === true;
  const maxJobsRaw = Reflect.get(body, 'max_jobs');

  const maxJobs =
    typeof maxJobsRaw === 'number' && maxJobsRaw > 0
      ? Math.min(Math.floor(maxJobsRaw), SWEEP_MAX_JOBS_CAP)
      : SWEEP_MAX_JOBS_DEFAULT;

  return {
    sweep,
    maxJobs: sweep ? maxJobs : 1,
  };
}
