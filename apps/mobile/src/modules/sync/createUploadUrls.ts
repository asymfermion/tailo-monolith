import { invokeTailoApi, readApiErrorMessage } from '@/lib/invokeTailoApi';
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
  try {
    const result = await invokeTailoApi('create-upload-urls', { ...request });

    if ('error' in result) {
      return { status: 'error', message: result.error };
    }

    const { ok, status, payload } = result;

    if (!ok) {
      return {
        status: 'error',
        message: readApiErrorMessage(
          payload,
          `Could not prepare uploads (${status}).`,
        ),
      };
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
