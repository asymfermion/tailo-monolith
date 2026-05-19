import { createClient } from '@supabase/supabase-js';

import { appEnv } from '@/lib/env';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  resetSupabaseClientForTests,
} from '@/lib/supabase';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

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

const mockCreateClient = jest.mocked(createClient);

describe('getSupabaseClient', () => {
  afterEach(() => {
    resetSupabaseClientForTests();
    mockCreateClient.mockReset();
  });

  it('reports whether env vars are present', () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('throws when Supabase env vars are missing', () => {
    expect(() => getSupabaseClient()).toThrow(/not configured/i);
  });

  it('returns a singleton client when env vars are set', () => {
    const fakeClient = { auth: {} };

    mockCreateClient.mockReturnValue(fakeClient as never);

    Object.assign(appEnv, {
      hasSupabaseConfig: true,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    });

    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(first).toBe(second);
    expect(first.auth).toBeDefined();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          storageKey: 'tailo.supabase.auth',
          persistSession: true,
        }),
      }),
    );
  });
});
