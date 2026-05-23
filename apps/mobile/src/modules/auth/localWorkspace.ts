import type { SecureStorage } from './secureStorage';
import { secureStorage } from './secureStorage';

const CURRENT_LOCAL_WORKSPACE_KEY = 'tailo.current_local_workspace';
const GLOBAL_APP_USER_ID_KEY = 'tailo.app_user_id';
const GLOBAL_ANONYMOUS_USER_ID_KEY = 'tailo.anonymous_user_id';
const DEFAULT_LOCAL_WORKSPACE_ID = 'device_default';

let memoryWorkspaceId: string | null = null;

function workspaceKey(workspaceId: string, key: string): string {
  return `tailo.workspace.${workspaceId}.${key}`;
}

function normalizeWorkspaceSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function buildAnonymousWorkspaceId(anonymousUserId: string): string {
  return `anon_${normalizeWorkspaceSegment(anonymousUserId)}`;
}

export function buildAppUserWorkspaceId(appUserId: string): string {
  return `app_${normalizeWorkspaceSegment(appUserId)}`;
}

async function deriveWorkspaceId(
  storage: SecureStorage = secureStorage,
): Promise<string> {
  const stored = await storage.getItemAsync(CURRENT_LOCAL_WORKSPACE_KEY);

  if (stored) {
    return stored;
  }

  const appUserId = await storage.getItemAsync(GLOBAL_APP_USER_ID_KEY);

  if (appUserId) {
    return buildAppUserWorkspaceId(appUserId);
  }

  const anonymousUserId = await storage.getItemAsync(
    GLOBAL_ANONYMOUS_USER_ID_KEY,
  );

  if (anonymousUserId) {
    return buildAnonymousWorkspaceId(anonymousUserId);
  }

  return DEFAULT_LOCAL_WORKSPACE_ID;
}

async function persistWorkspaceId(
  workspaceId: string,
  storage: SecureStorage = secureStorage,
): Promise<void> {
  memoryWorkspaceId = workspaceId;
  await storage.setItemAsync(CURRENT_LOCAL_WORKSPACE_KEY, workspaceId);
}

export async function getCurrentLocalWorkspaceId(
  storage: SecureStorage = secureStorage,
): Promise<string> {
  if (memoryWorkspaceId) {
    return memoryWorkspaceId;
  }

  const workspaceId = await deriveWorkspaceId(storage);
  memoryWorkspaceId = workspaceId;
  return workspaceId;
}

export async function setCurrentLocalWorkspaceForAnonymousUser(
  anonymousUserId: string,
  storage: SecureStorage = secureStorage,
): Promise<string> {
  const workspaceId = buildAnonymousWorkspaceId(anonymousUserId);
  await persistWorkspaceId(workspaceId, storage);
  return workspaceId;
}

export async function setCurrentLocalWorkspaceForAppUser(
  appUserId: string,
  storage: SecureStorage = secureStorage,
): Promise<string> {
  const workspaceId = buildAppUserWorkspaceId(appUserId);
  await persistWorkspaceId(workspaceId, storage);
  return workspaceId;
}

export async function clearCurrentLocalWorkspace(
  storage: SecureStorage = secureStorage,
): Promise<void> {
  memoryWorkspaceId = null;
  await storage.deleteItemAsync(CURRENT_LOCAL_WORKSPACE_KEY);
}

export function resetLocalWorkspaceForTests(): void {
  memoryWorkspaceId = null;
}

export function createWorkspaceSecureStorage(
  storage: SecureStorage = secureStorage,
): SecureStorage {
  return {
    async getItemAsync(key) {
      const workspaceId = await getCurrentLocalWorkspaceId(storage);
      return storage.getItemAsync(workspaceKey(workspaceId, key));
    },
    async setItemAsync(key, value, options) {
      const workspaceId = await getCurrentLocalWorkspaceId(storage);
      await storage.setItemAsync(
        workspaceKey(workspaceId, key),
        value,
        options,
      );
    },
    async deleteItemAsync(key) {
      const workspaceId = await getCurrentLocalWorkspaceId(storage);
      await storage.deleteItemAsync(workspaceKey(workspaceId, key));
    },
  };
}

export const workspaceSecureStorage = createWorkspaceSecureStorage();
