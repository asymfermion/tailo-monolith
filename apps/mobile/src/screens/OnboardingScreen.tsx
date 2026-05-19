import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';

import { colors, spacing } from '@/constants/theme';
import {
  formatPetOptionPhotoCount,
  getOnboardingPipelineTitle,
  getPetTypeStepTitle,
  t,
} from '@/i18n';
import { getDatabase } from '@/db';
import {
  getDetectedPetOptions,
  type DetectedPetOption,
} from '@/db/detectedPetOptions';
import {
  getProfilePhotoSuggestions,
  type ProfilePhotoSuggestion,
} from '@/db/profilePhotoSuggestion';
import type {
  OnboardingCompletedFlags,
  OnboardingState,
  OnboardingStep,
} from '@/modules/auth';
import { canContinueOnboardingScan } from '@/modules/auth/canContinueOnboardingScan';
import {
  ScanProgressIndicator,
  canScanPhotos,
  usePhotoAccess,
} from '@/modules/mediaScanner';
import {
  loadLocalPetProfile,
  saveLocalPetProfile,
  saveSelectedPetType,
  type LocalPetType,
} from '@/modules/pets';
type OnboardingScreenProps = {
  anonymousUserId: string;
  onboardingState: OnboardingState;
  onComplete: () => Promise<void>;
  onStepChange: (
    step: OnboardingStep,
    completedFlags?: Partial<OnboardingCompletedFlags>,
  ) => Promise<void>;
};

export function OnboardingScreen({
  anonymousUserId,
  onboardingState,
  onComplete,
  onStepChange,
}: OnboardingScreenProps) {
  const photoAccess = usePhotoAccess({ autoResumeOnMount: false });
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<LocalPetType | null>(null);
  const [profilePhotoSuggestions, setProfilePhotoSuggestions] = useState<
    ProfilePhotoSuggestion[]
  >([]);
  const [selectedProfilePhotoId, setSelectedProfilePhotoId] = useState<
    string | null
  >(null);
  const [isLoadingProfilePhotos, setIsLoadingProfilePhotos] = useState(false);
  const [detectedPetOptions, setDetectedPetOptions] = useState<
    DetectedPetOption[]
  >([]);
  const [isLoadingPetOptions, setIsLoadingPetOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const step = getEffectiveStep(
    onboardingState.step,
    petName,
    petType,
    onboardingState.completedFlags.scanStarted,
  );
  const canContinueAfterScan = canContinueOnboardingScan(photoAccess);
  const isPipelineActive =
    photoAccess.isScanning ||
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages;
  useEffect(() => {
    let isMounted = true;

    async function hydratePetProfile() {
      const profile = await loadLocalPetProfile();

      if (!isMounted || !profile) {
        return;
      }

      setPetName(profile.name);
      setPetType(profile.type);
    }

    void hydratePetProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (step !== 'pet_profile' || !petType) {
      return;
    }

    let isMounted = true;

    async function loadSuggestions() {
      setIsLoadingProfilePhotos(true);

      try {
        const database = await getDatabase();
        const suggestions = await getProfilePhotoSuggestions(database, petType);

        if (!isMounted) {
          return;
        }

        setProfilePhotoSuggestions(suggestions);
        setSelectedProfilePhotoId((current) => {
          if (
            current &&
            suggestions.some(
              (suggestion) => suggestion.localAssetId === current,
            )
          ) {
            return current;
          }

          return suggestions[0]?.localAssetId ?? null;
        });
      } finally {
        if (isMounted) {
          setIsLoadingProfilePhotos(false);
        }
      }
    }

    void loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [
    petType,
    step,
    photoAccess.bestImageSelectionProgress.selectedAssetCount,
  ]);

  useEffect(() => {
    if (step !== 'pet_select') {
      return;
    }

    let isMounted = true;

    async function loadPetOptions() {
      setIsLoadingPetOptions(true);

      try {
        const database = await getDatabase();
        const options = await getDetectedPetOptions(database);

        if (isMounted) {
          setDetectedPetOptions(options);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPetOptions(false);
        }
      }
    }

    void loadPetOptions();

    return () => {
      isMounted = false;
    };
  }, [step, photoAccess.bestImageSelectionProgress.selectedAssetCount]);

  useEffect(() => {
    if (
      step !== 'scan' ||
      isPipelineActive ||
      photoAccess.initialScanCompleted
    ) {
      return;
    }

    if (!canScanPhotos(photoAccess.permissionStatus)) {
      return;
    }

    void photoAccess.startScan();
  }, [isPipelineActive, photoAccess, step]);

  const selectedProfilePhoto = useMemo(
    () =>
      profilePhotoSuggestions.find(
        (suggestion) => suggestion.localAssetId === selectedProfilePhotoId,
      ) ?? null,
    [profilePhotoSuggestions, selectedProfilePhotoId],
  );

  const completeProfile = useCallback(async () => {
    if (!petName.trim() || !petType) {
      return;
    }

    setIsSaving(true);
    try {
      await saveLocalPetProfile({
        name: petName,
        type: petType,
        profilePhotoLocalAssetId: selectedProfilePhoto?.localAssetId ?? null,
        profilePhotoUri: selectedProfilePhoto?.uri ?? null,
      });
      await onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [onComplete, petName, petType, selectedProfilePhoto]);

  const body = useMemo(() => {
    switch (step) {
      case 'welcome':
      case 'photo_permission':
        return (
          <Panel
            eyebrow={t('onboarding.welcomeEyebrow')}
            title={t('onboarding.welcomeTitle')}
            text={t('onboarding.welcomeText')}
          >
            <PrimaryButton
              label={t('common.choosePhotos')}
              onPress={async () => {
                await onStepChange('scan', {
                  photoPermissionHandled: true,
                  scanStarted: true,
                });

                if (canScanPhotos(photoAccess.permissionStatus)) {
                  await photoAccess.startScan();
                  return;
                }

                await photoAccess.requestAccess();
              }}
            />
            <QuietButton
              label={t('onboarding.continueWithoutPhotos')}
              onPress={() =>
                onStepChange('pet_type', {
                  photoPermissionHandled: true,
                })
              }
            />
          </Panel>
        );
      case 'scan':
        return (
          <Panel
            eyebrow={t('onboarding.findingMomentsEyebrow')}
            title={getOnboardingPipelineTitle(photoAccess)}
            text={
              isPipelineActive
                ? t('onboarding.scanActiveText')
                : t('onboarding.scanIdleText')
            }
          >
            <ScanProgressIndicator photoAccess={photoAccess} />
            {photoAccess.errorMessage ? (
              <Text style={styles.mutedText}>{photoAccess.errorMessage}</Text>
            ) : null}
            <PrimaryButton
              disabled={!canContinueAfterScan}
              label={t('common.continue')}
              onPress={() => onStepChange('pet_select')}
            />
          </Panel>
        );
      case 'pet_select':
        return (
          <Panel
            eyebrow={t('onboarding.yourPetEyebrow')}
            title={t('onboarding.petSelectTitle')}
            text={t('onboarding.petSelectText')}
          >
            {isLoadingPetOptions ? (
              <Text style={styles.mutedText}>
                {t('onboarding.lookingForPetMoments')}
              </Text>
            ) : detectedPetOptions.length > 0 ? (
              <View style={styles.petOptionList}>
                {detectedPetOptions.map((option) => (
                  <PetOptionCard
                    isSelected={petType === option.type}
                    key={option.type}
                    label={t(`petType.${option.type}`)}
                    momentCount={option.momentCount}
                    previewUri={option.previewUri}
                    onPress={() => setPetType(option.type)}
                  />
                ))}
              </View>
            ) : (
              <OptionRow>
                <OptionButton
                  isSelected={petType === 'dog'}
                  label={t('petType.dog')}
                  onPress={() => setPetType('dog')}
                />
                <OptionButton
                  isSelected={petType === 'cat'}
                  label={t('petType.cat')}
                  onPress={() => setPetType('cat')}
                />
              </OptionRow>
            )}
            <PrimaryButton
              disabled={!petType || isSaving}
              label={t('common.continue')}
              onPress={async () => {
                if (!petType) {
                  return;
                }

                setIsSaving(true);
                try {
                  await saveSelectedPetType(petType);
                  await onStepChange('pet_profile', {
                    petSelected: true,
                    petTypeSet: true,
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
            />
          </Panel>
        );
      case 'pet_type':
        return (
          <Panel
            eyebrow={t('onboarding.petEyebrow')}
            title={getPetTypeStepTitle(petName)}
            text={t('onboarding.petTypeText')}
          >
            <OptionRow>
              <OptionButton
                isSelected={petType === 'dog'}
                label={t('petType.dog')}
                onPress={() => setPetType('dog')}
              />
              <OptionButton
                isSelected={petType === 'cat'}
                label={t('petType.cat')}
                onPress={() => setPetType('cat')}
              />
            </OptionRow>
            <PrimaryButton
              disabled={!petType || isSaving}
              label={t('common.continue')}
              onPress={async () => {
                if (!petType) {
                  return;
                }

                setIsSaving(true);
                try {
                  await saveSelectedPetType(petType);
                  await onStepChange('pet_profile', {
                    petTypeSet: true,
                    petSelected: true,
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
            />
          </Panel>
        );
      case 'pet_profile':
      case 'pet_name':
      case 'profile_photo':
        return (
          <Panel
            eyebrow={t('onboarding.petEyebrow')}
            title={t('onboarding.profileTitle')}
            text={t('onboarding.profileText')}
          >
            <TextInput
              autoCapitalize="words"
              onChangeText={setPetName}
              placeholder={t('onboarding.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={petName}
            />
            {petType ? (
              <>
                <Text style={styles.profilePhotoLabel}>
                  {t('onboarding.profilePhotoLabel')}
                </Text>
                {isLoadingProfilePhotos ? (
                  <Text style={styles.mutedText}>
                    {t('onboarding.loadingPhotoOptions')}
                  </Text>
                ) : profilePhotoSuggestions.length > 0 ? (
                  <View style={styles.profilePhotoRow}>
                    {profilePhotoSuggestions.map((suggestion) => (
                      <ProfilePhotoOption
                        isSelected={
                          selectedProfilePhotoId === suggestion.localAssetId
                        }
                        key={suggestion.localAssetId}
                        suggestion={suggestion}
                        onPress={() =>
                          setSelectedProfilePhotoId(suggestion.localAssetId)
                        }
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.mutedText}>
                    {t('onboarding.profilePhotoLater')}
                  </Text>
                )}
              </>
            ) : null}
            <PrimaryButton
              disabled={isSaving || !petName.trim() || !petType}
              label={t('common.finish')}
              onPress={completeProfile}
            />
          </Panel>
        );
      default:
        return null;
    }
  }, [
    canContinueAfterScan,
    completeProfile,
    isPipelineActive,
    detectedPetOptions,
    isLoadingPetOptions,
    isSaving,
    onStepChange,
    petName,
    petType,
    photoAccess,
    isLoadingProfilePhotos,
    profilePhotoSuggestions,
    selectedProfilePhotoId,
    step,
  ]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>{t('common.appName')}</Text>
      {body}
    </ScrollView>
  );
}

type PanelProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  text: string;
};

function Panel({ children, eyebrow, title, text }: PanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function ProfilePhotoOption({
  isSelected,
  suggestion,
  onPress,
}: {
  isSelected: boolean;
  suggestion: ProfilePhotoSuggestion;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[
        styles.profilePhotoOption,
        isSelected ? styles.profilePhotoOptionSelected : null,
      ]}
    >
      <Image
        contentFit="cover"
        source={{ uri: suggestion.uri }}
        style={styles.profilePhotoOptionImage}
      />
    </Pressable>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[styles.primaryButton, disabled ? styles.disabledButton : null]}
      onPress={onPress}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function QuietButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quietButton} onPress={onPress}>
      <Text style={styles.quietButtonText}>{label}</Text>
    </Pressable>
  );
}

function OptionRow({ children }: { children: ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

function OptionButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.optionButton, isSelected ? styles.selectedOption : null]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionButtonText,
          isSelected ? styles.selectedOptionText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PetOptionCard({
  isSelected,
  label,
  momentCount,
  previewUri,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  momentCount: number;
  previewUri: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.petOptionCard,
        isSelected ? styles.selectedPetOption : null,
      ]}
      onPress={onPress}
    >
      {previewUri ? (
        <Image
          contentFit="cover"
          source={{ uri: previewUri }}
          style={styles.petOptionImage}
        />
      ) : (
        <View style={styles.petOptionImagePlaceholder} />
      )}
      <View style={styles.petOptionMeta}>
        <Text style={styles.petOptionLabel}>{label}</Text>
        <Text style={styles.petOptionCount}>
          {formatPetOptionPhotoCount(momentCount)}
        </Text>
      </View>
    </Pressable>
  );
}

function getEffectiveStep(
  storedStep: OnboardingStep,
  _petName: string,
  petType: LocalPetType | null,
  scanStarted: boolean,
): OnboardingStep {
  if (storedStep === 'photo_permission') {
    return 'welcome';
  }

  if (
    storedStep === 'timeline_preview' ||
    storedStep === 'pet_gender' ||
    storedStep === 'pet_name' ||
    storedStep === 'profile_photo'
  ) {
    return 'pet_profile';
  }

  if (storedStep === 'pet_profile' && !petType) {
    return scanStarted ? 'pet_select' : 'pet_type';
  }

  return storedStep;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logo: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '600',
    marginBottom: spacing.xl,
  },
  panel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xl,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '600',
    lineHeight: 36,
    marginTop: spacing.sm,
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  panelBody: {
    marginTop: spacing.lg,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    color: colors.text,
    fontSize: 24,
    paddingVertical: spacing.md,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: 8,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  quietButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  quietButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectedOption: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: colors.surface,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  profilePhotoLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  profilePhotoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  profilePhotoOption: {
    aspectRatio: 1,
    backgroundColor: colors.border,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 2,
    flex: 1,
    overflow: 'hidden',
  },
  profilePhotoOptionSelected: {
    borderColor: colors.accent,
  },
  profilePhotoOptionImage: {
    height: '100%',
    width: '100%',
  },
  petOptionList: {
    gap: spacing.md,
  },
  petOptionCard: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  selectedPetOption: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  petOptionImage: {
    height: 88,
    width: 88,
  },
  petOptionImagePlaceholder: {
    backgroundColor: colors.border,
    height: 88,
    width: 88,
  },
  petOptionMeta: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  petOptionLabel: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  petOptionCount: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
