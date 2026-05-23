import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
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
  try {
    const result = await invokeTailoApi('get-event-updates', { ...request });

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          `Could not fetch event updates (${status}).`,
        ),
      };
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
