import type { LocalPetProfile } from '@/modules/pets';

import { initialOnboardingState } from './onboardingState';
import { resolveOnboardingAfterLoad } from './resolveOnboardingAfterLoad';

const sampleProfile: LocalPetProfile = {
  petId: 'local_pet_1',
  name: 'Mochi',
  type: 'cat',
  gender: null,
  birthday: null,
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

  it('reopens onboarding after reinstall when only SecureStore profile state remains', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      step: 'complete' as const,
    };

    expect(resolveOnboardingAfterLoad(stored, sampleProfile, false)).toEqual({
      ...initialOnboardingState,
      step: 'welcome',
      completed: false,
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        identityCreated: false,
        photoPermissionHandled: false,
        scanStarted: false,
        timelinePreviewSeen: false,
      },
    });
  });

  it('keeps completed state for a returning account even without local pet data', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      completionSource: 'returning_account' as const,
      step: 'complete' as const,
    };

    expect(resolveOnboardingAfterLoad(stored, null)).toEqual(stored);
  });

  it('reopens returning-account onboarding after reinstall when no local media was restored', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      completionSource: 'returning_account' as const,
      step: 'complete' as const,
    };

    expect(resolveOnboardingAfterLoad(stored, null, false)).toMatchObject({
      completed: false,
      step: 'welcome',
    });
  });

  it('reopens linked account onboarding when completion was not from returning sign-in', () => {
    const stored = {
      ...initialOnboardingState,
      completed: true,
      completionSource: 'local_setup' as const,
      step: 'complete' as const,
    };

    const resolved = resolveOnboardingAfterLoad(stored, null);

    expect(resolved).toMatchObject({
      completed: false,
      step: 'welcome',
    });
    expect(resolved).not.toHaveProperty('completionSource');
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

  it('reopens at welcome when in-progress onboarding survives reinstall without local media', () => {
    const stored = {
      ...initialOnboardingState,
      completed: false,
      step: 'pet_profile' as const,
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        identityCreated: true,
        scanStarted: true,
        timelinePreviewSeen: true,
        petTypeSet: true,
      },
    };

    expect(resolveOnboardingAfterLoad(stored, null, false)).toEqual({
      ...initialOnboardingState,
      step: 'welcome',
      completed: false,
      completedFlags: {
        ...initialOnboardingState.completedFlags,
        identityCreated: true,
      },
    });
  });
});
