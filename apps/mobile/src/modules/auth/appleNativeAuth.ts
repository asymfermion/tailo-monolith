import { useEffect, useState } from 'react';

import * as AppleAuthentication from 'expo-apple-authentication';

export type AppleNativeCredential = {
  identityToken: string;
  email: string | null;
  displayName: string | null;
  givenName: string | null;
  familyName: string | null;
};

export type AppleNativeSignInResult =
  | { status: 'credential'; credential: AppleNativeCredential }
  | { status: 'unavailable' }
  | { status: 'canceled' }
  | { status: 'error'; message: string };

export function resolveAppleDisplayName(
  credential: Pick<
    AppleNativeCredential,
    'displayName' | 'givenName' | 'familyName'
  >,
): string | null {
  const formatted = credential.displayName?.trim();

  if (formatted) {
    return formatted;
  }

  const parts = [credential.givenName, credential.familyName]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim());

  return parts.length > 0 ? parts.join(' ') : null;
}

function formatAppleDisplayName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): string | null {
  if (!fullName) {
    return null;
  }

  const name = [fullName.givenName, fullName.middleName, fullName.familyName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();

  return name || fullName.nickname?.trim() || null;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export function useAppleSignInAvailability(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void isAppleSignInAvailable().then((available) => {
      if (isMounted) {
        setIsAvailable(available);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return isAvailable;
}

export async function requestAppleNativeCredential(): Promise<AppleNativeSignInResult> {
  if (!(await isAppleSignInAvailable())) {
    return { status: 'unavailable' };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return {
        status: 'error',
        message: 'Apple did not return an identity token. Try again.',
      };
    }

    return {
      status: 'credential',
      credential: {
        identityToken: credential.identityToken,
        email: credential.email,
        displayName: formatAppleDisplayName(credential.fullName),
        givenName: credential.fullName?.givenName?.trim() || null,
        familyName: credential.fullName?.familyName?.trim() || null,
      },
    };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ERR_REQUEST_CANCELED'
    ) {
      return { status: 'canceled' };
    }

    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Apple sign-in failed.',
    };
  }
}
