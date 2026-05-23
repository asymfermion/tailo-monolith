import { saveLocalAccountProfile } from './localAccountProfile';
import { saveAccountProfile } from './persistAccountProfile';
import { syncRemoteAccountProfile } from './remoteAccountProfile';

jest.mock('./localAccountProfile', () => ({
  saveLocalAccountProfile: jest.fn(
    async (input: { displayName: string | null }) => ({
      displayName: input.displayName,
      updatedAt: '2026-05-19T00:00:00.000Z',
    }),
  ),
  loadLocalAccountProfile: jest.fn(),
}));

jest.mock('./remoteAccountProfile', () => ({
  syncRemoteAccountProfile: jest.fn(),
}));

describe('saveAccountProfile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('saves locally first, then syncs to the cloud', async () => {
    jest.mocked(syncRemoteAccountProfile).mockResolvedValue({
      status: 'synced',
      response: {
        app_user_id: 'app-1',
        display_name: 'Mochi',
        preferred_locale: 'en',
        preferred_theme: 'light',
        preferred_font_style: 'system',
        created: false,
        updated_at: '2026-05-19T00:00:00.000Z',
      },
    });

    const result = await saveAccountProfile({ displayName: 'Mochi' });

    expect(result).toMatchObject({ status: 'synced' });
    expect(saveLocalAccountProfile).toHaveBeenNthCalledWith(1, {
      displayName: 'Mochi',
    });
    expect(saveLocalAccountProfile).toHaveBeenNthCalledWith(2, {
      displayName: 'Mochi',
    });
    expect(syncRemoteAccountProfile).toHaveBeenCalledWith({
      displayName: 'Mochi',
    });
  });

  it('keeps local save when cloud sync fails', async () => {
    jest.mocked(syncRemoteAccountProfile).mockResolvedValue({
      status: 'error',
      message: 'Network error',
    });

    const result = await saveAccountProfile({ displayName: 'Mochi' });

    expect(result).toEqual({
      status: 'error',
      message: 'Network error',
      localSaved: true,
    });
    expect(saveLocalAccountProfile).toHaveBeenCalledTimes(1);
  });

  it('returns saved_local when cloud sync is unavailable', async () => {
    jest.mocked(syncRemoteAccountProfile).mockResolvedValue({
      status: 'not_linked',
    });

    await expect(saveAccountProfile({ displayName: 'Mochi' })).resolves.toEqual(
      { status: 'saved_local' },
    );
  });
});
