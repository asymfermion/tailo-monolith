import { getDatabase } from '@/db';
import {
  deletePersistedString,
  getPersistedString,
  setPersistedString,
} from '@/db/persistedStorage';
import { secureStorage } from '@/modules/auth/secureStorage';

import {
  clearSupabaseAuthStorage,
  resetSupabaseAuthStorageMigrationForTests,
  SUPABASE_AUTH_STORAGE_KEY,
  supabaseAuthStorage,
} from './supabaseAuthStorage';

jest.mock('@/db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('@/db/persistedStorage', () => ({
  getPersistedString: jest.fn(),
  setPersistedString: jest.fn(),
  deletePersistedString: jest.fn(),
}));

jest.mock('@/modules/auth/secureStorage', () => ({
  secureStorage: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));

const mockDb = { name: 'tailo.db' };
const getPersisted = jest.mocked(getPersistedString);
const setPersisted = jest.mocked(setPersistedString);
const deletePersisted = jest.mocked(deletePersistedString);
const secureStore = jest.mocked(secureStorage);

describe('supabaseAuthStorage', () => {
  beforeEach(() => {
    resetSupabaseAuthStorageMigrationForTests();
    jest.mocked(getDatabase).mockResolvedValue(mockDb as never);
    getPersisted.mockReset();
    setPersisted.mockReset();
    deletePersisted.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
    secureStore.deleteItemAsync.mockReset();
  });

  it('migrates a legacy SecureStore session into SQLite on first read', async () => {
    secureStore.getItemAsync.mockResolvedValue('{"access_token":"legacy"}');
    getPersisted
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('{"access_token":"legacy"}');

    await expect(
      supabaseAuthStorage.getItem(SUPABASE_AUTH_STORAGE_KEY),
    ).resolves.toBe('{"access_token":"legacy"}');

    expect(setPersisted).toHaveBeenCalledWith(
      mockDb,
      SUPABASE_AUTH_STORAGE_KEY,
      '{"access_token":"legacy"}',
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      SUPABASE_AUTH_STORAGE_KEY,
    );
  });

  it('writes new sessions to SQLite and clears any legacy SecureStore copy', async () => {
    secureStore.getItemAsync.mockResolvedValue(null);
    getPersisted.mockResolvedValue(null);

    await supabaseAuthStorage.setItem(
      SUPABASE_AUTH_STORAGE_KEY,
      '{"access_token":"fresh"}',
    );

    expect(setPersisted).toHaveBeenCalledWith(
      mockDb,
      SUPABASE_AUTH_STORAGE_KEY,
      '{"access_token":"fresh"}',
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      SUPABASE_AUTH_STORAGE_KEY,
    );
  });

  it('clears both SQLite and SecureStore', async () => {
    await clearSupabaseAuthStorage(mockDb as never);

    expect(deletePersisted).toHaveBeenCalledWith(
      mockDb,
      SUPABASE_AUTH_STORAGE_KEY,
    );
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      SUPABASE_AUTH_STORAGE_KEY,
    );
  });
});
