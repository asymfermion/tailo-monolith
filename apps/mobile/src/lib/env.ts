import Constants from 'expo-constants';

export const appEnv = {
  /** True when running inside Expo Go or a dev client build. */
  isDev: __DEV__,
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  hasSupabaseConfig: Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
