import type { getServiceRoleClient } from '../_shared/http.ts';
import type { FunctionLogger } from '../_shared/logger.ts';

/** Reset stuck `processing` jobs so the sweep can pick them up again. */
export async function releaseExpiredAiJobLeases(
  adminClient: ReturnType<typeof getServiceRoleClient>,
  nowIso: string,
  log: FunctionLogger,
): Promise<number> {
  const { data, error } = await adminClient
    .from('ai_jobs')
    .update({
      status: 'pending',
      leased_until: null,
      updated_at: nowIso,
    })
    .eq('status', 'processing')
    .or(`leased_until.is.null,leased_until.lt.${nowIso}`)
    .select('ai_job_id');

  if (error) {
    log.warn('lease_recovery_failed', { message: error.message });
    return 0;
  }

  const count = data?.length ?? 0;

  if (count > 0) {
    log.info('leases_released', { count });
  }

  return count;
}
