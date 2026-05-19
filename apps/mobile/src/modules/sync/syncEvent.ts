import { appEnv } from '@/lib/env';
import { getAuthAccessToken } from '@/modules/auth';
import {
  isSyncEventResponse,
  type SyncEventRequest,
  type SyncEventResponse,
} from '@tailo/shared';

export type SyncEventResult =
  | { status: 'success'; response: SyncEventResponse }
  | { status: 'error'; message: string };

export async function syncEvent(
  request: SyncEventRequest,
): Promise<SyncEventResult> {
  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return { status: 'error', message: 'Missing auth session token.' };
  }

  try {
    const response = await fetch(
      `${appEnv.supabaseUrl}/functions/v1/sync-event`,
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
          : `Could not sync event (${response.status}).`;

      return { status: 'error', message };
    }

    if (!isSyncEventResponse(payload)) {
      return { status: 'error', message: 'Invalid sync-event response.' };
    }

    return { status: 'success', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Could not sync event.',
    };
  }
}
