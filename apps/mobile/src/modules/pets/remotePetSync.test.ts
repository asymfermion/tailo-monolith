import {
  getAuthAccessToken,
  getAuthSession,
  isRemoteAuthConfigured,
} from '@/modules/auth/authService';
import {
  loadLocalPetProfile,
  saveLocalPetProfileWithRemoteId,
} from './petProfile';
import { syncRemotePetProfileIfNeeded } from './remotePetSync';

jest.mock('@/lib/env', () => ({
  appEnv: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}));

jest.mock('@/modules/auth/authService', () => ({
  isRemoteAuthConfigured: jest.fn(),
  getAuthSession: jest.fn(),
  getAuthAccessToken: jest.fn(),
}));

jest.mock('./petProfile', () => ({
  loadLocalPetProfile: jest.fn(),
  saveLocalPetProfileWithRemoteId: jest.fn(),
}));

describe('syncRemotePetProfileIfNeeded', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  it('skips when remote auth is not configured', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(false);

    await expect(syncRemotePetProfileIfNeeded()).resolves.toEqual({
      status: 'skipped',
    });
  });

  it('syncs a complete profile and stores remote pet id', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(getAuthAccessToken).mockResolvedValue('token-abc');
    jest.mocked(loadLocalPetProfile).mockResolvedValue({
      petId: 'local_pet_abc',
      name: 'Milo',
      type: 'dog',
      gender: null,
      birthday: null,
      profilePhotoLocalAssetId: null,
      profilePhotoUri: null,
      remotePetId: null,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });
    jest.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ pet_id: 'pet-remote-1', created: true }),
    } as Response);
    jest.mocked(saveLocalPetProfileWithRemoteId).mockResolvedValue({
      petId: 'local_pet_abc',
      name: 'Milo',
      type: 'dog',
      gender: null,
      birthday: null,
      profilePhotoLocalAssetId: null,
      profilePhotoUri: null,
      remotePetId: 'pet-remote-1',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    await expect(syncRemotePetProfileIfNeeded()).resolves.toEqual({
      status: 'synced',
      response: { pet_id: 'pet-remote-1', created: true },
    });

    expect(saveLocalPetProfileWithRemoteId).toHaveBeenCalledWith(
      expect.objectContaining({ petId: 'local_pet_abc' }),
      'pet-remote-1',
    );
  });

  it('returns incomplete when name is missing', async () => {
    jest.mocked(isRemoteAuthConfigured).mockReturnValue(true);
    jest.mocked(getAuthSession).mockResolvedValue({
      userId: 'user-1',
      isAnonymous: true,
      email: null,
      emailConfirmed: false,
    });
    jest.mocked(loadLocalPetProfile).mockResolvedValue({
      petId: 'local_pet_abc',
      name: '',
      type: 'dog',
      gender: null,
      birthday: null,
      profilePhotoLocalAssetId: null,
      profilePhotoUri: null,
      remotePetId: null,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    await expect(syncRemotePetProfileIfNeeded()).resolves.toEqual({
      status: 'incomplete_profile',
    });
  });
});
