import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SupabaseIntegrationEnv = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
};

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};

  if (!existsSync(filePath)) {
    return out;
  }

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');

    if (separator === -1) {
      continue;
    }

    out[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }

  return out;
}

export function repoRootFromModuleUrl(moduleUrl: string): string {
  return join(dirname(fileURLToPath(moduleUrl)), '../../../..');
}

export function loadSupabaseIntegrationEnv(
  moduleUrl: string,
): SupabaseIntegrationEnv | null {
  const root = repoRootFromModuleUrl(moduleUrl);
  const mobileEnv = parseEnvFile(join(root, 'apps/mobile/.env.local'));
  const supabaseEnv = parseEnvFile(join(root, 'supabase/.env.local'));
  const supabaseUrl = mobileEnv.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = mobileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey =
    supabaseEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    mobileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  return { supabaseUrl, anonKey, serviceRoleKey };
}
