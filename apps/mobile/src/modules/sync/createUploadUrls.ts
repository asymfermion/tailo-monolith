import { appEnv } from '@/lib/env';
import { getAuthAccessToken } from '@/modules/auth/authService';
import {
  isCreateUploadUrlsResponse,
  type CreateUploadUrlsRequest,
  type CreateUploadUrlsResponse,
} from '@tailo/shared';

export type CreateUploadUrlsResult =
  | { status: 'success'; response: CreateUploadUrlsResponse }
  | { status: 'error'; message: string };

export async function createUploadUrls(
  request: CreateUploadUrlsRequest,
): Promise<CreateUploadUrlsResult> {
  const accessToken = await getAuthAccessToken();

  if (!accessToken) {
    return { status: 'error', message: 'Missing auth session token.' };
  }

  try {
    const response = await fetch(
      `${appEnv.supabaseUrl}/functions/v1/create-upload-urls`,
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
          : `Could not prepare uploads (${response.status}).`;

      return { status: 'error', message };
    }

    if (!isCreateUploadUrlsResponse(payload)) {
      return {
        status: 'error',
        message: 'Invalid upload URL response from server.',
      };
    }

    return { status: 'success', response: payload };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Could not request upload URLs.',
    };
  }
}
