import {
  ANONYMOUS_USER_ID_KEY,
  generateAnonymousUserId,
  getOrCreateAnonymousUserId,
} from './identity';
import { resetLocalWorkspaceForTests } from './localWorkspace';
import type { SecureStorage } from './secureStorage';

jest.mock('@/db', () => ({
  invalidateDatabaseConnection: jest.fn().mockResolvedValue(undefined),
}));

function createStorage(initialValue: string | null = null): SecureStorage & {
  setItemAsync: jest.Mock;
} {
  let value = initialValue;

  return {
    getItemAsync: jest.fn(async () => value),
    setItemAsync: jest.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
    deleteItemAsync: jest.fn(async () => {
      value = null;
    }),
  };
}

describe('getOrCreateAnonymousUserId', () => {
  beforeEach(() => {
    resetLocalWorkspaceForTests();
  });

  it('returns the stored anonymous user id when present', async () => {
    const storage = createStorage('anon_existing');

    await expect(getOrCreateAnonymousUserId(storage)).resolves.toBe(
      'anon_existing',
    );
    expect(storage.setItemAsync).not.toHaveBeenCalled();
  });

  it('generates and stores an id on first launch', async () => {
    const storage = createStorage();

    const id = await getOrCreateAnonymousUserId(storage);

    expect(id).toMatch(/^anon_/);
    expect(storage.setItemAsync).toHaveBeenCalledWith(
      ANONYMOUS_USER_ID_KEY,
      id,
    );
  });
});

describe('generateAnonymousUserId', () => {
  it('creates local anonymous ids', () => {
    expect(generateAnonymousUserId()).toMatch(/^anon_[a-z0-9]+_[a-z0-9]+$/);
  });
});
