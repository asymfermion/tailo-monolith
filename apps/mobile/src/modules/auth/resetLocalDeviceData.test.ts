import * as FileSystem from 'expo-file-system/legacy';

import { invalidateDatabaseConnection } from '@/db';

import { notifyAuthSessionChanged } from './authSessionEvents';
import { clearSecureUserData } from './installIdentity';
import { initialOnboardingState, saveOnboardingState } from './onboardingState';
import {
  deleteAllLocalDatabaseFiles,
  resetLocalDeviceData,
} from './resetLocalDeviceData';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('@/db', () => ({
  invalidateDatabaseConnection: jest.fn(),
}));

jest.mock('./installIdentity', () => ({
  clearSecureUserData: jest.fn(),
}));

jest.mock('./onboardingState', () => ({
  initialOnboardingState: { completed: false, step: 'welcome' },
  saveOnboardingState: jest.fn(),
}));

jest.mock('./authSessionEvents', () => ({
  notifyAuthSessionChanged: jest.fn(),
}));

describe('deleteAllLocalDatabaseFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes every tailo workspace database file', async () => {
    jest.mocked(FileSystem.getInfoAsync).mockResolvedValue({
      exists: true,
      uri: '/mock/documents/SQLite',
      size: 0,
      isDirectory: true,
      modificationTime: 0,
    });
    jest
      .mocked(FileSystem.readDirectoryAsync)
      .mockResolvedValue([
        'tailo.db',
        'tailo.db-wal',
        'tailo.db-shm',
        'tailo.app_user_abc.db',
        'tailo.app_user_abc.db-wal',
        'other.db',
        'tailo.backup',
      ]);

    await deleteAllLocalDatabaseFiles();

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(5);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      '/mock/documents/SQLite/tailo.db',
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      '/mock/documents/SQLite/tailo.db-wal',
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      '/mock/documents/SQLite/tailo.db-shm',
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      '/mock/documents/SQLite/tailo.app_user_abc.db',
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      '/mock/documents/SQLite/tailo.app_user_abc.db-wal',
      { idempotent: true },
    );
  });

  it('no-ops when the SQLite directory is missing', async () => {
    jest.mocked(FileSystem.getInfoAsync).mockResolvedValue({
      exists: false,
      uri: '/mock/documents/SQLite',
      isDirectory: false,
    });

    await deleteAllLocalDatabaseFiles();

    expect(FileSystem.readDirectoryAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});

describe('resetLocalDeviceData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(FileSystem.getInfoAsync).mockResolvedValue({
      exists: false,
      uri: '/mock/documents/SQLite',
      isDirectory: false,
    });
  });

  it('wipes sqlite, clears secure data, and restores onboarding', async () => {
    await resetLocalDeviceData();

    expect(invalidateDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(clearSecureUserData).toHaveBeenCalledTimes(1);
    expect(saveOnboardingState).toHaveBeenCalledWith(initialOnboardingState);
    expect(notifyAuthSessionChanged).toHaveBeenCalledTimes(1);
  });
});
