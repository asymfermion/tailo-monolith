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
import { getDatabase } from '@/db';
import {
  getProfilePhotoSuggestion,
  type ProfilePhotoSuggestion,
} from '@/db/profilePhotoSuggestion';
import type {
  OnboardingCompletedFlags,
  OnboardingState,
  OnboardingStep,
} from '@/modules/auth';
import { usePhotoAccess } from '@/modules/mediaScanner';
import {
  saveLocalPetProfile,
  type LocalPetGender,
  type LocalPetType,
} from '@/modules/pets';
import { useTimelineEvents } from '@/modules/timeline';

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
  const photoAccess = usePhotoAccess();
  const timeline = useTimelineEvents(
    photoAccess.bestImageSelectionProgress.selectedAssetCount,
  );
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<LocalPetType | null>(null);
  const [petGender, setPetGender] = useState<LocalPetGender | null>(null);
  const [profilePhotoSuggestion, setProfilePhotoSuggestion] =
    useState<ProfilePhotoSuggestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const step = getEffectiveStep(onboardingState.step, petName, petType);
  const isPipelineActive =
    photoAccess.isScanning ||
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages;
  const canContinueAfterScan =
    !isPipelineActive &&
    (photoAccess.bestImageSelectionProgress.selectedAssetCount > 0 ||
      photoAccess.petDetectionProgress.processedCount > 0 ||
      photoAccess.permissionStatus === 'denied');
  const firstTimelineEvent = timeline.events[0];

  useEffect(() => {
    if (step !== 'profile_photo') {
      return;
    }

    let isMounted = true;

    async function loadSuggestion() {
      const database = await getDatabase();
      const suggestion = await getProfilePhotoSuggestion(database);

      if (isMounted) {
        setProfilePhotoSuggestion(suggestion);
      }
    }

    void loadSuggestion();

    return () => {
      isMounted = false;
    };
  }, [step, photoAccess.bestImageSelectionProgress.selectedAssetCount]);

  const completeProfile = useCallback(async () => {
    if (!petName.trim() || !petType) {
      return;
    }

    setIsSaving(true);
    try {
      await saveLocalPetProfile({
        name: petName,
        type: petType,
        gender: petGender,
        profilePhotoLocalAssetId: profilePhotoSuggestion?.localAssetId ?? null,
        profilePhotoUri: profilePhotoSuggestion?.uri ?? null,
      });
      await onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [onComplete, petGender, petName, petType, profilePhotoSuggestion]);

  const body = useMemo(() => {
    switch (step) {
      case 'photo_permission':
        return (
          <Panel
            eyebrow="Photos"
            title="Choose the photos Tailo can use"
            text="Tailo starts by looking at recent photos on this device. You can pick all photos or only selected ones."
          >
            <PrimaryButton
              label="Choose Photos"
              onPress={async () => {
                await onStepChange('scan', {
                  photoPermissionHandled: true,
                  scanStarted: true,
                });
                await photoAccess.requestAccess();
              }}
            />
            <QuietButton
              label="Continue Without Photos"
              onPress={() =>
                onStepChange('pet_name', {
                  photoPermissionHandled: true,
                })
              }
            />
          </Panel>
        );
      case 'scan':
        return (
          <Panel
            eyebrow="Finding moments"
            title={getPipelineTitle(photoAccess)}
            text="A few useful moments can appear before the full scan is done."
          >
            <ProgressSummary photoAccess={photoAccess} />
            <PrimaryButton
              disabled={!canContinueAfterScan}
              label="Continue"
              onPress={() =>
                onStepChange('timeline_preview', {
                  timelinePreviewSeen: true,
                })
              }
            />
          </Panel>
        );
      case 'timeline_preview':
        return (
          <Panel
            eyebrow="Timeline"
            title="Your first moments are ready"
            text="Tailo will keep this timeline local while setup finishes."
          >
            {firstTimelineEvent?.media[0] ? (
              <Image
                contentFit="cover"
                source={{ uri: firstTimelineEvent.media[0].uri }}
                style={styles.previewImage}
              />
            ) : (
              <Text style={styles.mutedText}>
                Your timeline will fill in as pet moments are found.
              </Text>
            )}
            <PrimaryButton
              label="Continue"
              onPress={() => onStepChange('pet_name')}
            />
          </Panel>
        );
      case 'pet_name':
        return (
          <Panel
            eyebrow="Pet"
            title="What’s your pet’s name?"
            text="This keeps the timeline feeling like theirs."
          >
            <TextInput
              autoCapitalize="words"
              onChangeText={setPetName}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={petName}
            />
            <PrimaryButton
              disabled={!petName.trim()}
              label="Continue"
              onPress={() =>
                onStepChange('pet_type', {
                  petNameSet: true,
                })
              }
            />
          </Panel>
        );
      case 'pet_type':
        return (
          <Panel
            eyebrow="Pet"
            title={`Is ${petName || 'your pet'} a dog or cat?`}
            text="Tailo will use this later for better memories."
          >
            <OptionRow>
              <OptionButton
                isSelected={petType === 'dog'}
                label="Dog"
                onPress={() => setPetType('dog')}
              />
              <OptionButton
                isSelected={petType === 'cat'}
                label="Cat"
                onPress={() => setPetType('cat')}
              />
            </OptionRow>
            <PrimaryButton
              disabled={!petType}
              label="Continue"
              onPress={() =>
                onStepChange('pet_gender', {
                  petTypeSet: true,
                })
              }
            />
          </Panel>
        );
      case 'pet_gender':
        return (
          <Panel
            eyebrow="Pet"
            title="Add gender?"
            text="This is optional and only used for local display."
          >
            <OptionRow>
              <OptionButton
                isSelected={petGender === 'female'}
                label="Female"
                onPress={() => setPetGender('female')}
              />
              <OptionButton
                isSelected={petGender === 'male'}
                label="Male"
                onPress={() => setPetGender('male')}
              />
              <OptionButton
                isSelected={petGender === 'unknown'}
                label="Skip"
                onPress={() => setPetGender('unknown')}
              />
            </OptionRow>
            <PrimaryButton
              label="Continue"
              onPress={() =>
                onStepChange('profile_photo', {
                  petGenderSet: true,
                })
              }
            />
          </Panel>
        );
      case 'profile_photo':
        return (
          <Panel
            eyebrow="Profile"
            title="A first profile photo"
            text="Tailo picked this from the strongest local pet moment."
          >
            {profilePhotoSuggestion ? (
              <Image
                contentFit="cover"
                source={{ uri: profilePhotoSuggestion.uri }}
                style={styles.profileImage}
              />
            ) : (
              <Text style={styles.mutedText}>
                No profile photo suggestion yet. You can add one later.
              </Text>
            )}
            <PrimaryButton
              disabled={isSaving || !petName.trim() || !petType}
              label={profilePhotoSuggestion ? 'Use This Photo' : 'Finish'}
              onPress={completeProfile}
            />
          </Panel>
        );
      case 'welcome':
      default:
        return (
          <Panel
            eyebrow="Welcome"
            title="Let Tailo find the moments"
            text="Start without an account. Tailo keeps the first timeline local and quiet."
          >
            <Text style={styles.identityText}>
              Local setup {anonymousUserId.slice(-6)}
            </Text>
            <PrimaryButton
              label="Get Started"
              onPress={() => onStepChange('photo_permission')}
            />
          </Panel>
        );
    }
  }, [
    anonymousUserId,
    canContinueAfterScan,
    completeProfile,
    firstTimelineEvent,
    isSaving,
    onStepChange,
    petGender,
    petName,
    petType,
    photoAccess,
    profilePhotoSuggestion,
    step,
  ]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>Tailo</Text>
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

function ProgressSummary({
  photoAccess,
}: {
  photoAccess: ReturnType<typeof usePhotoAccess>;
}) {
  return (
    <View style={styles.progress}>
      <Text style={styles.progressValue}>
        {photoAccess.progress.scannedCount.toLocaleString()} photos checked
      </Text>
      <Text style={styles.progressHint}>
        {photoAccess.bestImageSelectionProgress.selectedAssetCount.toLocaleString()}{' '}
        photos selected for moments
      </Text>
    </View>
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

function getPipelineTitle(photoAccess: ReturnType<typeof usePhotoAccess>) {
  if (photoAccess.isScanning) {
    return 'Finding moments...';
  }

  if (photoAccess.isDetectingPets) {
    return 'Looking for pet moments';
  }

  if (photoAccess.isClusteringEvents) {
    return 'Building your timeline';
  }

  if (photoAccess.isSelectingImages) {
    return 'Choosing the best photos';
  }

  if (photoAccess.petDetectionProgress.petCandidateCount === 0) {
    return 'Ready when more moments appear';
  }

  return 'First moments are ready';
}

function getEffectiveStep(
  storedStep: OnboardingStep,
  petName: string,
  petType: LocalPetType | null,
): OnboardingStep {
  const needsPetName =
    storedStep === 'pet_type' ||
    storedStep === 'pet_gender' ||
    storedStep === 'profile_photo';

  if (needsPetName && !petName.trim()) {
    return 'pet_name';
  }

  if (
    (storedStep === 'pet_gender' || storedStep === 'profile_photo') &&
    !petType
  ) {
    return 'pet_type';
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
  identityText: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
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
  progress: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  progressValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  progressHint: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  previewImage: {
    aspectRatio: 1.3,
    backgroundColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  profileImage: {
    alignSelf: 'center',
    aspectRatio: 1,
    backgroundColor: colors.border,
    borderRadius: 80,
    overflow: 'hidden',
    width: 160,
  },
});
