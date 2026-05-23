import { secureStorage } from './secureStorage';

/** Set when the user logs out of a linked account; blocks app until email sign-in. */
export const AUTH_REQUIRE_LOGIN_KEY = 'tailo.auth_require_login';

export async function isAuthRequireLogin(): Promise<boolean> {
  return (await secureStorage.getItemAsync(AUTH_REQUIRE_LOGIN_KEY)) === '1';
}

export async function setAuthRequireLogin(): Promise<void> {
  await secureStorage.setItemAsync(AUTH_REQUIRE_LOGIN_KEY, '1');
}

export async function clearAuthRequireLogin(): Promise<void> {
  await secureStorage.deleteItemAsync(AUTH_REQUIRE_LOGIN_KEY);
}
