import { invokeTailoApi } from '@/lib/invokeTailoApi';
import {
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authSessionAccess';

import { deleteRemoteAccountIfPossible } from './deleteRemoteAccount';

jest.mock('@/lib/invokeTailoApi', () => ({
  invokeTailoApi: jest.fn(),
  readApiErrorMessage: (_payload: unknown, fallback: string) =>
    (typeof _payload === 'object' &&
    _payload &&
    typeof Reflect.get(_payload, 'error') === 'string'
      ? Reflect.get(_payload, 'error')
      : fallback) as string,
}));

jest.mock('@/modules/auth/authSessionAccess', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
}));

describe('deleteRemoteAccountIfPossible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'auth-user-1',
      isAnonymous: false,
      email: 'user@example.com',
      emailConfirmed: true,
    });
  });

  it('skips when remote auth is not configured', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(false);

    await expect(deleteRemoteAccountIfPossible()).resolves.toEqual({
      status: 'skipped',
    });
    expect(invokeTailoApi).not.toHaveBeenCalled();
  });

  it('skips when there is no active session', async () => {
    jest.mocked(getAuthSession).mockResolvedValue(null);

    await expect(deleteRemoteAccountIfPossible()).resolves.toEqual({
      status: 'skipped',
    });
    expect(invokeTailoApi).not.toHaveBeenCalled();
  });

  it('deletes the remote account when the API succeeds', async () => {
    jest.mocked(invokeTailoApi).mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        deleted: true,
        app_user_id: 'app-user-1',
        auth_user_id: 'auth-user-1',
      },
    });

    await expect(deleteRemoteAccountIfPossible()).resolves.toEqual({
      status: 'deleted',
      appUserId: 'app-user-1',
    });
    expect(invokeTailoApi).toHaveBeenCalledWith('delete-account');
  });

  it('returns an error when the API fails', async () => {
    jest.mocked(invokeTailoApi).mockResolvedValue({
      ok: false,
      status: 500,
      payload: { error: 'Delete failed.' },
    });

    await expect(deleteRemoteAccountIfPossible()).resolves.toEqual({
      status: 'error',
      message: 'Delete failed.',
    });
  });
});
