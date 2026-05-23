import { parseTailoApiRequest } from '../../../packages/shared/src/contracts/tailo-api.ts';
import { getAuthenticatedUser, jsonResponse } from './http.ts';
import type { FunctionLogger } from './logger.ts';
import type { ApiHandler } from './handlers/types.ts';

export function createApiRouter(
  handlers: Record<string, ApiHandler>,
): (request: Request, log: FunctionLogger) => Promise<Response> {
  const allowedActions = Object.keys(handlers);

  return async (request: Request, log: FunctionLogger): Promise<Response> => {
    const authResult = await getAuthenticatedUser(request, log);

    if ('error' in authResult) {
      return authResult.error;
    }

    const parsed = parseTailoApiRequest(
      await request.json().catch(() => null),
      allowedActions,
    );

    if (!parsed || !(parsed.action in handlers)) {
      return jsonResponse(
        {
          error: 'Invalid API request. Expected { action, ...payload }.',
          code: 'invalid_request',
        },
        422,
      );
    }

    const handler = handlers[parsed.action]!;

    log.info('api_dispatch', { action: parsed.action });

    return handler({
      user: authResult.user,
      log,
      payload: parsed.payload,
    });
  };
}
