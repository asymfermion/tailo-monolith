import {
  isSyncNotificationsResponse,
  type SyncNotificationsRequest,
  type SyncNotificationsResponse,
} from '@tailo/shared';

import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';

type ApiResult<T> =
  | { status: 'success'; response: T }
  | { status: 'error'; message: string };

export async function syncNotifications(
  request: SyncNotificationsRequest,
): Promise<ApiResult<SyncNotificationsResponse>> {
  try {
    const result = await invokeTailoApi('sync-notifications', request);

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;
    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          `Could not sync notifications (${status}).`,
        ),
      };
    }

    if (!isSyncNotificationsResponse(payload)) {
      return {
        status: 'error',
        message: 'Invalid sync-notifications response.',
      };
    }

    return { status: 'success', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Could not sync notifications.',
    };
  }
}
