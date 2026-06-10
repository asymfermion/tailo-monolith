import {
  isAppleSignInAvailable,
  requestAppleNativeCredential,
  resolveAppleDisplayName,
} from './appleNativeAuth';

const mockIsAvailableAsync = jest.fn();
const mockSignInAsync = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  signInAsync: (options: unknown) => mockSignInAsync(options),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}));

describe('appleNativeAuth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
  });

  it('resolves Apple display names from structured name parts', () => {
    expect(
      resolveAppleDisplayName({
        displayName: null,
        givenName: 'Mochi',
        familyName: 'Parent',
      }),
    ).toBe('Mochi Parent');
  });

  it('reports native availability', async () => {
    await expect(isAppleSignInAvailable()).resolves.toBe(true);
  });

  it('returns unavailable when native auth cannot be used', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(requestAppleNativeCredential()).resolves.toEqual({
      status: 'unavailable',
    });
    expect(mockSignInAsync).not.toHaveBeenCalled();
  });

  it('formats the first Apple credential name and returns token data', async () => {
    mockSignInAsync.mockResolvedValue({
      identityToken: 'id-token',
      email: 'relay@example.com',
      fullName: {
        givenName: 'Mochi',
        middleName: null,
        familyName: 'Parent',
        nickname: null,
      },
    });

    await expect(requestAppleNativeCredential()).resolves.toMatchObject({
      status: 'credential',
      credential: {
        identityToken: 'id-token',
        email: 'relay@example.com',
        displayName: 'Mochi Parent',
      },
    });
    expect(mockSignInAsync).toHaveBeenCalledWith({
      requestedScopes: [0, 1],
    });
  });

  it('returns an error when Apple does not return an identity token', async () => {
    mockSignInAsync.mockResolvedValue({
      identityToken: null,
      email: null,
      fullName: null,
    });

    await expect(requestAppleNativeCredential()).resolves.toEqual({
      status: 'error',
      message: 'Apple did not return an identity token. Try again.',
    });
  });

  it('treats Apple request cancellation separately', async () => {
    mockSignInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    await expect(requestAppleNativeCredential()).resolves.toEqual({
      status: 'canceled',
    });
  });

  it('returns native Apple errors without throwing', async () => {
    mockSignInAsync.mockRejectedValue(new Error('Native Apple auth failed.'));

    await expect(requestAppleNativeCredential()).resolves.toEqual({
      status: 'error',
      message: 'Native Apple auth failed.',
    });
  });
});
