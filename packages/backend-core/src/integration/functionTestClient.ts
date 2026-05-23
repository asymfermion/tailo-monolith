import { createClient } from '@supabase/supabase-js';
import {
  buildTailoApiBody,
  getTailoApiFunctionForAction,
  type TailoApiAction,
} from '@tailo/shared';

import type { SupabaseIntegrationEnv } from './loadIntegrationEnv.ts';

export type FunctionInvokeResult = {
  status: number;
  body: unknown;
};

export async function signInAnonymously(env: SupabaseIntegrationEnv): Promise<{
  accessToken: string;
  userId: string;
}> {
  const client = createClient(env.supabaseUrl, env.anonKey);
  const { data, error } = await client.auth.signInAnonymously();

  if (error || !data.session) {
    throw new Error(
      `Anonymous sign-in failed: ${error?.message ?? 'no session'}`,
    );
  }

  return {
    accessToken: data.session.access_token,
    userId: data.user.id,
  };
}

export async function invokeEdgeFunction(
  env: SupabaseIntegrationEnv,
  functionName: string,
  options: {
    accessToken?: string | null;
    serviceRole?: boolean;
    body?: Record<string, unknown>;
  } = {},
): Promise<FunctionInvokeResult> {
  const token = options.serviceRole ? env.serviceRoleKey : options.accessToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: env.anonKey,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${env.supabaseUrl}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(options.body ?? {}),
    },
  );

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

export async function invokeTailoApi(
  env: SupabaseIntegrationEnv,
  action: TailoApiAction,
  options: {
    accessToken?: string | null;
    body?: Record<string, unknown>;
  } = {},
): Promise<FunctionInvokeResult> {
  return invokeEdgeFunction(env, getTailoApiFunctionForAction(action), {
    accessToken: options.accessToken,
    body: buildTailoApiBody(action, options.body ?? {}),
  });
}

export function readStringField(body: unknown, key: string): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const value = Reflect.get(body, key);

  return typeof value === 'string' ? value : null;
}
