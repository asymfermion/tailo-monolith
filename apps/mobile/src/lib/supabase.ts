/**
 * Low-level Supabase client factory. Auth goes through `modules/auth` (`AuthProvider`);
 * sync/upload should use HTTP APIs, not direct table access from screens.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { appEnv } from '@/lib/env';
import { secureStorage } from '@/modules/auth/secureStorage';

const SUPABASE_AUTH_STORAGE_KEY = 'tailo.supabase.auth';

let client: SupabaseClient | null = null;

/** Expo SecureStore adapter for Supabase Auth session persistence. */
const supabaseAuthStorage = {
  getItem: (key: string) => secureStorage.getItemAsync(key),
  setItem: (key: string, value: string) =>
    secureStorage.setItemAsync(key, value),
  removeItem: (key: string) => secureStorage.deleteItemAsync(key),
};

export function isSupabaseConfigured(): boolean {
  return appEnv.hasSupabaseConfig;
}

/** Shared Supabase client (anon key). Throws if env vars are missing. */
export function getSupabaseClient(): SupabaseClient {
  if (!appEnv.hasSupabaseConfig) {
    throw new Error(
      'Supabase is not configured. Copy apps/mobile/.env.example to .env.local and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  if (!client) {
    client = createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        storage: supabaseAuthStorage,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

/** @internal Test-only reset of the singleton. */
export function resetSupabaseClientForTests(): void {
  client = null;
}
