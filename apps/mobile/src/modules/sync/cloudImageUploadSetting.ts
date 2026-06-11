import { useSyncExternalStore } from 'react';

import { appEnv } from '@/lib/env';
import { secureStorage } from '@/modules/auth/secureStorage';

export const CLOUD_IMAGE_UPLOADS_ENABLED_STORAGE_KEY =
  'tailo.dev.cloud_image_uploads_enabled';

const DEFAULT_CLOUD_IMAGE_UPLOADS_ENABLED = !appEnv.showDeveloperSettings;

let currentCloudImageUploadsEnabled = DEFAULT_CLOUD_IMAGE_UPLOADS_ENABLED;
const listeners = new Set<() => void>();

export function getCloudImageUploadsEnabled(): boolean {
  return currentCloudImageUploadsEnabled;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function applyCloudImageUploadsEnabled(enabled: boolean): boolean {
  if (currentCloudImageUploadsEnabled === enabled) {
    return currentCloudImageUploadsEnabled;
  }

  currentCloudImageUploadsEnabled = enabled;
  notifyListeners();
  return currentCloudImageUploadsEnabled;
}

export async function hydrateCloudImageUploadsEnabled(): Promise<boolean> {
  const storedValue = await secureStorage.getItemAsync(
    CLOUD_IMAGE_UPLOADS_ENABLED_STORAGE_KEY,
  );

  if (storedValue === '0') {
    return applyCloudImageUploadsEnabled(false);
  }

  if (storedValue === '1') {
    return applyCloudImageUploadsEnabled(true);
  }

  return applyCloudImageUploadsEnabled(DEFAULT_CLOUD_IMAGE_UPLOADS_ENABLED);
}

export async function setCloudImageUploadsEnabled(
  enabled: boolean,
): Promise<boolean> {
  await secureStorage.setItemAsync(
    CLOUD_IMAGE_UPLOADS_ENABLED_STORAGE_KEY,
    enabled ? '1' : '0',
  );

  return applyCloudImageUploadsEnabled(enabled);
}

export function subscribeCloudImageUploadsEnabled(
  listener: () => void,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useCloudImageUploadsEnabled(): boolean {
  return useSyncExternalStore(
    subscribeCloudImageUploadsEnabled,
    getCloudImageUploadsEnabled,
    () => DEFAULT_CLOUD_IMAGE_UPLOADS_ENABLED,
  );
}
