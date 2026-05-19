import { createClient, type User } from '@supabase/supabase-js';
import { corsHeaders } from './cors.ts';
import type { FunctionLogger } from './logger.ts';

export function handleOptions(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return null;
}

export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function projectRefFromSupabaseUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

/** True when the request carries this project's service role secret or JWT. */
export function isServiceRoleAuthorization(request: Request): boolean {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (!serviceRoleKey) {
    return false;
  }

  const bearer = readBearerToken(request);
  const apiKey = request.headers.get('apikey')?.trim();

  if (
    (bearer && bearer === serviceRoleKey) ||
    (apiKey && apiKey === serviceRoleKey)
  ) {
    return true;
  }

  const tokenToCheck = bearer ?? apiKey;

  if (!tokenToCheck) {
    return false;
  }

  const payload = decodeJwtPayload(tokenToCheck);

  if (payload?.role !== 'service_role') {
    return false;
  }

  const expectedRef = projectRefFromSupabaseUrl(Deno.env.get('SUPABASE_URL'));

  if (!expectedRef) {
    return true;
  }

  return payload.ref === expectedRef;
}

export async function getAuthenticatedUser(
  request: Request,
  log?: FunctionLogger,
): Promise<{ user: User } | { error: Response }> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    log?.warn('auth_missing_header');
    return { error: jsonResponse({ error: 'Missing authorization header' }, 401) };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    log?.error('auth_server_misconfigured');
    return { error: jsonResponse({ error: 'Server configuration error' }, 500) };
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    log?.warn('auth_invalid_jwt', {
      message: userError?.message ?? 'no_user',
    });
    return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  log?.info('auth_user_ok', { userId: user.id });
  return { user };
}

export function getServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Invoke another Edge Function with service role credentials.
 * Requires target function deployed with verify_jwt=false OR valid JWT + apikey.
 */
export async function invokeServiceFunction(
  functionName: string,
  body: Record<string, unknown> = {},
  log?: FunctionLogger,
): Promise<{ ok: boolean; status: number; body: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    log?.error('invoke_skipped', { functionName, reason: 'missing_env' });
    return { ok: false, status: 0, body: '' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: anonKey ?? serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const responseBody = await response.text();

    if (!response.ok) {
      log?.warn('invoke_failed', {
        functionName,
        status: response.status,
        bodyPreview: responseBody.slice(0, 300),
      });
    } else {
      log?.info('invoke_ok', { functionName, status: response.status });
    }

    return { ok: response.ok, status: response.status, body: responseBody };
  } catch (error) {
    log?.error('invoke_exception', {
      functionName,
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, status: 0, body: '' };
  }
}
