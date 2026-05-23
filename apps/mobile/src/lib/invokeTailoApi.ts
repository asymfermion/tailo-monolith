import { appEnv } from '@/lib/env';
import { getAuthAccessToken } from '@/modules/auth/authService';
import {
  buildTailoApiBody,
  getTailoApiFunctionForAction,
  type TailoApiAction,
} from '@tailo/shared';

export type InvokeTailoApiResult = {
  ok: boolean;
  status: number;
  payload: unknown;
};

export type InvokeTailoApiError = {
  error: string;
};

export async function invokeTailoApi(
  action: TailoApiAction,
  payload: Record<string, unknown> = {},
): Promise<InvokeTailoApiResult | InvokeTailoApiError> {
  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return { error: 'Missing auth session token.' };
  }

  try {
    const functionName = getTailoApiFunctionForAction(action);
    const response = await fetch(
      `${appEnv.supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          apikey: appEnv.supabaseAnonKey,
        },
        body: JSON.stringify(buildTailoApiBody(action, payload)),
      },
    );

    return {
      ok: response.ok,
      status: response.status,
      payload: await response.json().catch(() => null),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Request failed.',
    };
  }
}

export function readApiErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (
    typeof payload === 'object' &&
    payload &&
    typeof Reflect.get(payload, 'error') === 'string'
  ) {
    return String(Reflect.get(payload, 'error'));
  }

  return fallback;
}
