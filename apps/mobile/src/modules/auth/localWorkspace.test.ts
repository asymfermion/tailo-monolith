import {
  buildAnonymousWorkspaceId,
  buildAppUserWorkspaceId,
  getCurrentLocalWorkspaceId,
  preserveCurrentLocalWorkspace,
  resetLocalWorkspaceForTests,
} from './localWorkspace';
import type { SecureStorage } from './secureStorage';

function createStorage(initial: Record<string, string> = {}): SecureStorage & {
  store: Record<string, string>;
} {
  const store = { ...initial };

  return {
    store,
    getItemAsync: async (key: string) => store[key] ?? null,
    setItemAsync: async (key: string, value: string) => {
      store[key] = value;
    },
    deleteItemAsync: async (key: string) => {
      delete store[key];
    },
  };
}

describe('preserveCurrentLocalWorkspace', () => {
  beforeEach(() => {
    resetLocalWorkspaceForTests();
  });

  it('keeps new installs on the default device workspace', async () => {
    const storage = createStorage();

    await expect(getCurrentLocalWorkspaceId(storage)).resolves.toBe(
      'device_default',
    );
    await expect(preserveCurrentLocalWorkspace(storage)).resolves.toBe(
      'device_default',
    );

    expect(storage.store['tailo.current_local_workspace']).toBeUndefined();
  });

  it('preserves an existing workspace for backwards compatibility', async () => {
    const workspaceId = buildAppUserWorkspaceId('existing-user');
    const storage = createStorage({
      'tailo.current_local_workspace': workspaceId,
    });

    await expect(getCurrentLocalWorkspaceId(storage)).resolves.toBe(
      workspaceId,
    );

    await expect(preserveCurrentLocalWorkspace(storage)).resolves.toBe(
      workspaceId,
    );
    expect(storage.store['tailo.current_local_workspace']).toBe(workspaceId);
  });

  it('does not move anonymous workspaces after cloud identity is created', async () => {
    const workspaceId = buildAnonymousWorkspaceId('anon-existing');
    const storage = createStorage({
      'tailo.current_local_workspace': workspaceId,
    });

    await expect(preserveCurrentLocalWorkspace(storage)).resolves.toBe(
      workspaceId,
    );
    expect(storage.store['tailo.current_local_workspace']).toBe(workspaceId);
  });
});
