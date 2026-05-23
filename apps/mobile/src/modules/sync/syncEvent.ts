import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
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
  try {
    const result = await invokeTailoApi('sync-event', { ...request });

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          `Could not sync event (${status}).`,
        ),
      };
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
