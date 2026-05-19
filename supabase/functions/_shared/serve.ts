import { handleOptions, jsonResponse } from './http.ts';
import { createFunctionLogger, type FunctionLogger } from './logger.ts';

/**
 * Standard POST Edge Function entry: OPTIONS, method guard, invoke logging, errors.
 */
export function servePostFunction(
  functionName: string,
  handler: (request: Request, log: FunctionLogger) => Promise<Response>,
): void {
  Deno.serve(async (request) => {
    const log = createFunctionLogger(functionName);

    log.info('invoked', {
      method: request.method,
      hasAuthorization: Boolean(request.headers.get('Authorization')),
      hasApiKey: Boolean(request.headers.get('apikey')),
    });

    const options = handleOptions(request);

    if (options) {
      return options;
    }

    if (request.method !== 'POST') {
      log.warn('method_not_allowed', { method: request.method });
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const response = await handler(request, log);
      log.info('completed', { status: response.status });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('unhandled_exception', { message });
      return jsonResponse({ error: message }, 500);
    }
  });
}
