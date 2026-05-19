import type { LocalPetProfile } from '@/modules/pets';

import { initialOnboardingState } from './onboardingState';
import { resolveOnboardingAfterLoad } from './resolveOnboardingAfterLoad';

const sampleProfile: LocalPetProfile = {
  petId: 'local_pet_1',
  name: 'Mochi',
  type: 'cat',
  gender: null,
  profilePhotoLocalAssetId: null,
  profilePhotoUri: null,
  remotePetId: null,
  createdAt: '2026-05-18T00:00:00.000Z',
  updatedAt: '2026-05-18T00:00:00.000Z',
};

describe('resolveOnboardingAfterLoad', () => {
  it('keeps completed state when a pet profile exists', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      step: 'complete' as const,
    };

    expect(resolveOnboardingAfterLoad(stored, sampleProfile)).toEqual(stored);
  });

  it('reopens onboarding at pet_type when completed flag is stale without scan', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      step: 'complete' as const,
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        identityCreated: true,
        photoPermissionHandled: true,
      },
    };

    expect(resolveOnboardingAfterLoad(stored, null)).toMatchObject({
      completed: false,
      step: 'pet_type',
    });
  });

  it('returns to pet selection when scan finished but pet type not chosen', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      step: 'complete' as const,
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        scanStarted: true,
        timelinePreviewSeen: true,
      },
    };

    expect(resolveOnboardingAfterLoad(stored, null)).toMatchObject({
      completed: false,
      step: 'pet_select',
    });
  });

  it('returns to pet profile when scan finished and pet type is already chosen', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      step: 'complete' as const,
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        scanStarted: true,
      },
    };

    expect(
      resolveOnboardingAfterLoad(stored, {
        ...sampleProfile,
        name: '',
      }),
    ).toMatchObject({
      completed: false,
      step: 'pet_profile',
    });
  });
});
