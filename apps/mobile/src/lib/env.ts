import Constants from 'expo-constants';

export const appEnv = {
  /** True when running inside Expo Go or a Metro/dev-client session. */
  isDev: __DEV__,
  /**
   * Enables internal-only UI like developer settings in debug sessions and
   * internal preview builds that opt in at build time.
   */
  showDeveloperSettings:
    __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_SETTINGS === '1',
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  hasSupabaseConfig: Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
