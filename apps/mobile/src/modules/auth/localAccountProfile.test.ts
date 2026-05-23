import {
  loadLocalAccountProfile,
  saveLocalAccountProfile,
} from './localAccountProfile';
import { LOCAL_ACCOUNT_PROFILE_KEY } from './keys';
import type { SecureStorage } from './secureStorage';

function createMemoryStorage(): SecureStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();

  return {
    store,
    getItemAsync: async (key) => store.get(key) ?? null,
    setItemAsync: async (key, value) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key) => {
      store.delete(key);
    },
  };
}

describe('localAccountProfile', () => {
  it('persists and loads display name', async () => {
    const storage = createMemoryStorage();

    await saveLocalAccountProfile({ displayName: '  Mochi  ' }, storage);

    await expect(loadLocalAccountProfile(storage)).resolves.toEqual({
      displayName: 'Mochi',
      updatedAt: expect.any(String),
    });
  });

  it('stores null display name when cleared', async () => {
    const storage = createMemoryStorage();

    await saveLocalAccountProfile({ displayName: 'Mochi' }, storage);
    await saveLocalAccountProfile({ displayName: null }, storage);

    await expect(loadLocalAccountProfile(storage)).resolves.toMatchObject({
      displayName: null,
    });
  });

  it('returns null for invalid stored JSON', async () => {
    const storage = createMemoryStorage();
    storage.store.set(LOCAL_ACCOUNT_PROFILE_KEY, '{not json');

    await expect(loadLocalAccountProfile(storage)).resolves.toBeNull();
  });
});
