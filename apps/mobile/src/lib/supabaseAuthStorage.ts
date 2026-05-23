import type * as SQLite from 'expo-sqlite';

import { getDatabase } from '@/db';
import {
  deletePersistedString,
  getPersistedString,
  setPersistedString,
} from '@/db/persistedStorage';
import { secureStorage } from '@/modules/auth/secureStorage';

/** Supabase `auth.storageKey` — session JSON often exceeds SecureStore's 2048-byte limit. */
export const SUPABASE_AUTH_STORAGE_KEY = 'tailo.supabase.auth';

let migratedLegacySecureStoreSession = false;

async function migrateLegacySecureStoreSession(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  if (migratedLegacySecureStoreSession) {
    return;
  }

  migratedLegacySecureStoreSession = true;

  const legacyValue = await secureStorage.getItemAsync(
    SUPABASE_AUTH_STORAGE_KEY,
  );

  if (!legacyValue) {
    return;
  }

  const currentValue = await getPersistedString(db, SUPABASE_AUTH_STORAGE_KEY);

  if (!currentValue) {
    await setPersistedString(db, SUPABASE_AUTH_STORAGE_KEY, legacyValue);
  }

  await secureStorage.deleteItemAsync(SUPABASE_AUTH_STORAGE_KEY);
}

/** SQLite-backed adapter for Supabase Auth (large JWT session blobs). */
export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const db = await getDatabase();
    await migrateLegacySecureStoreSession(db);

    return getPersistedString(db, key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const db = await getDatabase();
    await migrateLegacySecureStoreSession(db);
    await setPersistedString(db, key, value);
    await secureStorage.deleteItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    const db = await getDatabase();
    await deletePersistedString(db, key);
    await secureStorage.deleteItemAsync(key);
  },
};

export async function clearSupabaseAuthStorage(
  db?: SQLite.SQLiteDatabase,
): Promise<void> {
  if (db) {
    await deletePersistedString(db, SUPABASE_AUTH_STORAGE_KEY);
  } else {
    const database = await getDatabase();
    await deletePersistedString(database, SUPABASE_AUTH_STORAGE_KEY);
  }

  await secureStorage.deleteItemAsync(SUPABASE_AUTH_STORAGE_KEY);
}

/** @internal Test-only reset of migration guard. */
export function resetSupabaseAuthStorageMigrationForTests(): void {
  migratedLegacySecureStoreSession = false;
}
