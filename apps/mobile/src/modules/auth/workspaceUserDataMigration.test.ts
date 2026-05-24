import * as FileSystem from 'expo-file-system/legacy';

import { migrateWorkspaceUserData } from './workspaceUserDataMigration';
import type { SecureStorage } from './secureStorage';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn(),
  copyAsync: jest.fn(),
}));

function createStorage(initial: Record<string, string> = {}): SecureStorage & {
  store: Record<string, string>;
  setItemAsync: jest.Mock;
} {
  const store = { ...initial };

  return {
    store,
    getItemAsync: async (key: string) => store[key] ?? null,
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: async (key: string) => {
      delete store[key];
    },
  };
}

describe('migrateWorkspaceUserData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(FileSystem.getInfoAsync)
      .mockResolvedValue({ exists: false } as never);
  });

  it('copies the sqlite database when the destination file is missing', async () => {
    const storage = createStorage();
    jest
      .mocked(FileSystem.getInfoAsync)
      .mockResolvedValueOnce({ exists: true } as never)
      .mockResolvedValueOnce({ exists: false } as never);

    await migrateWorkspaceUserData('app_old', 'app_new', storage);

    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///docs/SQLite/tailo.app_old.db',
      to: 'file:///docs/SQLite/tailo.app_new.db',
    });
  });
});
