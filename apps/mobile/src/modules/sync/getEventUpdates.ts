import { appEnv } from '@/lib/env';
import { getAuthAccessToken } from '@/modules/auth/authService';
import {
  isGetEventUpdatesResponse,
  type GetEventUpdatesRequest,
  type GetEventUpdatesResponse,
} from '@tailo/shared';

export type GetEventUpdatesResult =
  | { status: 'success'; response: GetEventUpdatesResponse }
  | { status: 'error'; message: string };

export async function getEventUpdates(
  request: GetEventUpdatesRequest = {},
): Promise<GetEventUpdatesResult> {
  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return { status: 'error', message: 'Missing auth session token.' };
  }

  try {
    const response = await fetch(
      `${appEnv.supabaseUrl}/functions/v1/get-event-updates`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          apikey: appEnv.supabaseAnonKey,
        },
        body: JSON.stringify(request),
      },
    );

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof payload === 'object' &&
        payload &&
        typeof Reflect.get(payload, 'error') === 'string'
          ? String(Reflect.get(payload, 'error'))
          : `Could not fetch event updates (${response.status}).`;

      return { status: 'error', message };
    }

    if (!isGetEventUpdatesResponse(payload)) {
      return {
        status: 'error',
        message: 'Invalid get-event-updates response.',
      };
    }

    return { status: 'success', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Could not fetch event updates.',
    };
  }
}
