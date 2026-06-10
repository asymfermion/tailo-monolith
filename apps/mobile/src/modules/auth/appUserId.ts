import { secureStorage } from '@/modules/auth/secureStorage';

export const APP_USER_ID_KEY = 'tailo.app_user_id';

let memoryAppUserId: string | null = null;

export async function getTailoAppUserId(): Promise<string | null> {
  if (memoryAppUserId) {
    return memoryAppUserId;
  }

  const stored = await secureStorage.getItemAsync(APP_USER_ID_KEY);
  memoryAppUserId = stored;
  return stored;
}

export async function clearTailoAppUserIdCache(): Promise<void> {
  memoryAppUserId = null;
  await secureStorage.deleteItemAsync(APP_USER_ID_KEY);
}

export async function persistTailoAppUserId(appUserId: string): Promise<void> {
  memoryAppUserId = appUserId;
  await secureStorage.setItemAsync(APP_USER_ID_KEY, appUserId);
}
