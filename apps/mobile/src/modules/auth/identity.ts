import { secureStorage, type SecureStorage } from './secureStorage';

export const ANONYMOUS_USER_ID_KEY = 'tailo.anonymous_user_id';
export const LEGACY_ANON_LINKED_KEY = 'tailo.legacy_anon_linked';

/** Phase 1 legacy id if present — does not create a new id. */
export async function getLegacyAnonymousUserId(
  storage: SecureStorage = secureStorage,
): Promise<string | null> {
  return storage.getItemAsync(ANONYMOUS_USER_ID_KEY);
}

export async function getOrCreateAnonymousUserId(
  storage: SecureStorage = secureStorage,
): Promise<string> {
  const existingId = await storage.getItemAsync(ANONYMOUS_USER_ID_KEY);

  if (existingId) {
    return existingId;
  }

  const nextId = generateAnonymousUserId();
  await storage.setItemAsync(ANONYMOUS_USER_ID_KEY, nextId);

  return nextId;
}

export function generateAnonymousUserId(): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `anon_${Date.now().toString(36)}_${randomPart}`;
}
