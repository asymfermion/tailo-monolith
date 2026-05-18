import type * as SQLite from 'expo-sqlite';

import { countLocalAssets } from '@/db/localAssets';
import { getSyncStateValue, setSyncStateValue } from '@/db/syncState';

import { ANONYMOUS_USER_ID_KEY } from './identity';
import { ONBOARDING_STATE_KEY } from './onboardingState';
import {
  clearSecureUserData,
  INSTALL_ID_KEY,
  reconcileInstallIdentity,
} from './installIdentity';
import type { SecureStorage } from './secureStorage';

jest.mock('@/db/localAssets', () => ({
  countLocalAssets: jest.fn(),
}));

jest.mock('@/db/syncState', () => ({
  SYNC_STATE_KEYS: { APP_INSTALL_ID: 'app.install_id' },
  getSyncStateValue: jest.fn(),
  setSyncStateValue: jest.fn(),
}));

function createStorage(
  values: Record<string, string | null> = {},
): SecureStorage & {
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
} {
  const store = { ...values };

  return {
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
}

describe('reconcileInstallIdentity', () => {
  const database = {} as SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(countLocalAssets).mockResolvedValue(0);
    jest.mocked(getSyncStateValue).mockResolvedValue(null);
    jest.mocked(setSyncStateValue).mockResolvedValue(undefined);
  });

  it('clears stale SecureStore when the database is empty but Keychain has session data', async () => {
    const storage = createStorage({
      [ONBOARDING_STATE_KEY]: JSON.stringify({ completed: true }),
      [ANONYMOUS_USER_ID_KEY]: 'anon_old',
      [INSTALL_ID_KEY]: 'install_old',
    });

    const result = await reconcileInstallIdentity(database, storage);

    expect(result.clearedStaleSecureStore).toBe(true);
    expect(storage.deleteItemAsync).toHaveBeenCalled();
    expect(setSyncStateValue).toHaveBeenCalledWith(
      database,
      'app.install_id',
      expect.stringMatching(/^install_/),
    );
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      INSTALL_ID_KEY,
      expect.stringMatching(/^install_/),
      expect.any(Object),
    );
  });

  it('keeps SecureStore when upgrading an existing local database', async () => {
    jest.mocked(countLocalAssets).mockResolvedValue(12);
    const storage = createStorage({
      [INSTALL_ID_KEY]: 'install_existing',
      [ONBOARDING_STATE_KEY]: JSON.stringify({ completed: true }),
    });

    const result = await reconcileInstallIdentity(database, storage);

    expect(result.clearedStaleSecureStore).toBe(false);
    expect(storage.deleteItemAsync).not.toHaveBeenCalled();
    expect(setSyncStateValue).toHaveBeenCalledWith(
      database,
      'app.install_id',
      'install_existing',
    );
  });

  it('clears SecureStore when install ids disagree', async () => {
    jest.mocked(getSyncStateValue).mockResolvedValue('install_db');
    const storage = createStorage({
      [INSTALL_ID_KEY]: 'install_keychain',
    });

    const result = await reconcileInstallIdentity(database, storage);

    expect(result.clearedStaleSecureStore).toBe(true);
    expect(storage.deleteItemAsync).toHaveBeenCalled();
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      INSTALL_ID_KEY,
      'install_db',
      expect.any(Object),
    );
  });
});

describe('clearSecureUserData', () => {
  it('removes all Tailo secure keys', async () => {
    const storage = createStorage({
      [ONBOARDING_STATE_KEY]: '{}',
    });

    await clearSecureUserData(storage);

    expect(storage.deleteItemAsync).toHaveBeenCalled();
    expect(storage.deleteItemAsync.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});
