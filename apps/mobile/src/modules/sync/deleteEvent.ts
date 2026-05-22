import { appEnv } from '@/lib/env';
import { getAuthAccessToken } from '@/modules/auth/authService';
import {
  isDeleteEventResponse,
  type DeleteEventRequest,
  type DeleteEventResponse,
} from '@tailo/shared';

export type DeleteEventResult =
  | { status: 'success'; response: DeleteEventResponse }
  | { status: 'error'; message: string };

export async function deleteEvent(
  request: DeleteEventRequest,
): Promise<DeleteEventResult> {
  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return { status: 'error', message: 'Missing auth session token.' };
  }

  try {
    const response = await fetch(
      `${appEnv.supabaseUrl}/functions/v1/delete-event`,
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
          : `Could not delete event (${response.status}).`;

      return { status: 'error', message };
    }

    if (!isDeleteEventResponse(payload)) {
      return { status: 'error', message: 'Invalid delete-event response.' };
    }

    return { status: 'success', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Could not delete event.',
    };
  }
}
