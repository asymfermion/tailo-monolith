jest.mock('@/lib/env', () => ({
  appEnv: {
    hasSupabaseConfig: false,
    supabaseUrl: '',
    supabaseAnonKey: '',
  },
}));

jest.mock('@/modules/auth/secureStorage', () => ({
  secureStorage: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));

import { appEnv } from '@/lib/env';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  resetSupabaseClientForTests,
} from '@/lib/supabase';

describe('getSupabaseClient', () => {
  afterEach(() => {
    resetSupabaseClientForTests();
  });

  it('reports whether env vars are present', () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('throws when Supabase env vars are missing', () => {
    expect(() => getSupabaseClient()).toThrow(/not configured/i);
  });

  it('returns a singleton client when env vars are set', () => {
    Object.assign(appEnv, {
      hasSupabaseConfig: true,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    });

    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(first).toBe(second);
    expect(first.auth).toBeDefined();
  });
});
