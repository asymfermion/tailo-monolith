import { parseProcessAiJobInvokeRequest } from '../../../packages/backend-core/src/usecases/aiJobLease.ts';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  isServiceRoleAuthorization,
  jsonResponse,
} from '../_shared/http.ts';
import { servePostFunction } from '../_shared/serve.ts';

import { processOneJobPass } from './processOneJobPass.ts';
import { releaseExpiredAiJobLeases } from './releaseExpiredLeases.ts';

servePostFunction('process-ai-job', async (request, log) => {
  if (isServiceRoleAuthorization(request)) {
    log.info('auth_ok', { mode: 'service_role' });
  } else {
    const bearerPresent = Boolean(request.headers.get('Authorization'));
    log.warn('auth_rejected', {
      bearerPresent,
      hasApiKey: Boolean(request.headers.get('apikey')),
      hint: 'Use project service_role key (not anon) in Authorization and apikey; redeploy with --no-verify-jwt',
    });

    const authResult = await getAuthenticatedUser(request, log);

    if ('error' in authResult) {
      return jsonResponse(
        {
          error: 'Unauthorized',
          code: 'service_role_or_user_jwt_required',
          hint: 'Pass Authorization: Bearer <service_role> and apikey: <service_role or anon>. If using the correct key, run: npx supabase functions deploy process-ai-job --no-verify-jwt',
        },
        401,
      );
    }
  }

  const requestBody = await request.json().catch(() => ({}));
  const { sweep, maxJobs } = parseProcessAiJobInvokeRequest(requestBody);

  if (sweep) {
    log.info('sweep_start', { maxJobs });
  }

  const adminClient = getServiceRoleClient();
  const nowIso = new Date().toISOString();
  const releasedLeases = await releaseExpiredAiJobLeases(
    adminClient,
    nowIso,
    log,
  );

  const results: Record<string, unknown>[] = [];

  for (let index = 0; index < maxJobs; index += 1) {
    const passNow = new Date().toISOString();
    const result = await processOneJobPass(adminClient, log, passNow);
    results.push(result);

    if (result.status === 'idle') {
      break;
    }
  }

  if (!sweep) {
    const single = results[0] ?? { status: 'idle', reason: 'no_pending_jobs' };

    if (single.status === 'idle') {
      log.info('idle', { reason: single.reason, releasedLeases });
    }

    return jsonResponse(single);
  }

  const processedCount = results.filter((row) => row.status !== 'idle').length;

  log.info('sweep_complete', {
    releasedLeases,
    processedCount,
    maxJobs,
    lastStatus: results.at(-1)?.status,
  });

  return jsonResponse({
    status: 'sweep_complete',
    released_leases: releasedLeases,
    processed_count: processedCount,
    results,
  });
});
