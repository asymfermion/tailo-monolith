import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
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
  try {
    const result = await invokeTailoApi('delete-event', { ...request });

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          `Could not delete event (${status}).`,
        ),
      };
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
