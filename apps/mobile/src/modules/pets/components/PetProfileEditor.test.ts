import {
  canSavePetProfileDraft,
  hasPetProfileDraftChanges,
} from './PetProfileEditor';

describe('canSavePetProfileDraft', () => {
  it('requires name and type', () => {
    expect(canSavePetProfileDraft({ name: 'Mochi', type: 'dog' })).toBe(true);
    expect(canSavePetProfileDraft({ name: ' ', type: 'dog' })).toBe(false);
    expect(canSavePetProfileDraft({ name: 'Mochi', type: null })).toBe(false);
  });

  it('detects when the draft still matches the saved profile', () => {
    expect(
      hasPetProfileDraftChanges({
        profile: {
          petId: 'pet-1',
          name: 'Mochi',
          type: 'dog',
          gender: 'female',
          birthday: '2020-05-09',
          profilePhotoLocalAssetId: 'asset-1',
          profilePhotoUri: 'file://mochi.jpg',
          remotePetId: null,
          createdAt: '2026-06-11T00:00:00.000Z',
          updatedAt: '2026-06-11T00:00:00.000Z',
        },
        name: 'Mochi',
        type: 'dog',
        gender: 'female',
        birthday: '2020-05-09',
        profilePhotoLocalAssetId: 'asset-1',
        profilePhotoUri: 'file://mochi.jpg',
      }),
    ).toBe(false);
  });

  it('detects when a draft field actually changed', () => {
    expect(
      hasPetProfileDraftChanges({
        profile: {
          petId: 'pet-1',
          name: 'Mochi',
          type: 'dog',
          gender: 'female',
          birthday: '2020-05-09',
          profilePhotoLocalAssetId: 'asset-1',
          profilePhotoUri: 'file://mochi.jpg',
          remotePetId: null,
          createdAt: '2026-06-11T00:00:00.000Z',
          updatedAt: '2026-06-11T00:00:00.000Z',
        },
        name: 'Mochi',
        type: 'dog',
        gender: 'female',
        birthday: '2020-05-09',
        profilePhotoLocalAssetId: 'asset-2',
        profilePhotoUri: 'file://mochi-new.jpg',
      }),
    ).toBe(true);
  });
});
