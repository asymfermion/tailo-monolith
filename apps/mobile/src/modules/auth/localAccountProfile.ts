import { workspaceSecureStorage } from './localWorkspace';
import { LOCAL_ACCOUNT_PROFILE_KEY } from './keys';
import type { SecureStorage } from './secureStorage';

export type LocalAccountProfile = {
  displayName: string | null;
  updatedAt: string;
};

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLocalAccountProfile(
  value: unknown,
): LocalAccountProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const updatedAt = Reflect.get(value, 'updatedAt');

  if (typeof updatedAt !== 'string') {
    return null;
  }

  return {
    displayName: normalizeDisplayName(Reflect.get(value, 'displayName')),
    updatedAt,
  };
}

export async function loadLocalAccountProfile(
  storage: SecureStorage = workspaceSecureStorage,
): Promise<LocalAccountProfile | null> {
  const storedValue = await storage.getItemAsync(LOCAL_ACCOUNT_PROFILE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return normalizeLocalAccountProfile(JSON.parse(storedValue));
  } catch {
    return null;
  }
}

export async function saveLocalAccountProfile(
  input: Pick<LocalAccountProfile, 'displayName'>,
  storage: SecureStorage = workspaceSecureStorage,
): Promise<LocalAccountProfile> {
  const profile: LocalAccountProfile = {
    displayName: normalizeDisplayName(input.displayName),
    updatedAt: new Date().toISOString(),
  };

  await storage.setItemAsync(
    LOCAL_ACCOUNT_PROFILE_KEY,
    JSON.stringify(profile),
  );

  return profile;
}
