import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppTextInput } from '@/components/AppTextInput';

import { t, useAppLocale } from '@/i18n';
import { formatPetType } from '@/lib/formatMoment';
import { useAppearance, useThemedStyles } from '@/lib/appearance';
import { SettingsOptionPicker } from '@/screens/settings/SettingsOptionPicker';

import {
  saveLocalPetProfile,
  type LocalPetGender,
  type LocalPetProfile,
  type LocalPetType,
} from '../petProfile';
import { PetBirthdayPicker } from './PetBirthdayPicker';
import { createPetProfileEditorStyles } from './petProfileEditorStyles';

type PetProfileEditorProps = {
  profile: LocalPetProfile | null;
  isLoading?: boolean;
  onProfileSaved?: () => Promise<void> | void;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function canSavePetProfileDraft(input: {
  name: string;
  type: LocalPetType | null;
}): boolean {
  return Boolean(input.name.trim() && input.type);
}

export function PetProfileEditor({
  profile,
  isLoading = false,
  onProfileSaved,
}: PetProfileEditorProps) {
  useAppLocale();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createPetProfileEditorStyles);
  const profilePetId = profile?.petId ?? null;
  const profileName = profile?.name ?? '';
  const profileType = profile?.type ?? null;
  const profileGender = profile?.gender ?? null;
  const profileBirthday = profile?.birthday ?? null;
  const skipAutoSaveRef = useRef(true);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<LocalPetType | null>(null);
  const [gender, setGender] = useState<LocalPetGender | null>(null);
  const [birthday, setBirthday] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    skipAutoSaveRef.current = true;

    if (!profilePetId) {
      setPetName('');
      setPetType(null);
      setGender(null);
      setBirthday(null);
      setSaveStatus('idle');
      return;
    }

    setPetName(profileName);
    setPetType(profileType);
    setGender(profileGender);
    setBirthday(profileBirthday);
    setSaveStatus('idle');

    const frame = requestAnimationFrame(() => {
      skipAutoSaveRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [profileBirthday, profileGender, profileName, profilePetId, profileType]);

  const canSave = canSavePetProfileDraft({ name: petName, type: petType });

  const persistProfile = useCallback(async () => {
    if (!profile || !canSave || !petType) {
      return;
    }

    setSaveStatus('saving');

    try {
      await saveLocalPetProfile({
        name: petName,
        type: petType,
        gender,
        birthday,
        profilePhotoLocalAssetId: profile.profilePhotoLocalAssetId,
        profilePhotoUri: profile.profilePhotoUri,
      });
      await onProfileSaved?.();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [birthday, canSave, gender, onProfileSaved, petName, petType, profile]);

  useEffect(() => {
    if (skipAutoSaveRef.current || !profile) {
      return;
    }

    const timer = setTimeout(() => {
      void persistProfile();
    }, 450);

    return () => clearTimeout(timer);
  }, [petName, petType, gender, birthday, persistProfile, profile]);

  const petTypeOptions = (['dog', 'cat'] as const).map((value) => ({
    value,
    label: formatPetType(value),
  }));

  const genderOptions = (['female', 'male', 'unknown'] as const).map(
    (value) => ({
      value,
      label: formatPetGenderLabel(value),
    }),
  );

  const selectedGender = gender ?? 'unknown';

  if (isLoading && !profile) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!profile) {
    return <Text style={styles.emptyText}>{t('petProfile.emptyState')}</Text>;
  }

  const avatarInitial = petName.trim().slice(0, 1).toUpperCase() || 'P';
  const previewUri = profile.profilePhotoUri;

  return (
    <View style={styles.card}>
      {previewUri ? (
        <Image
          accessibilityLabel={t('accessibility.profilePhoto', {
            name: petName.trim() || t('petProfile.fallbackName'),
          })}
          contentFit="cover"
          source={{ uri: previewUri }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>{avatarInitial}</Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>{t('petProfile.nameLabel')}</Text>
      <AppTextInput
        autoCapitalize="words"
        autoCorrect={false}
        placeholder={t('onboarding.namePlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={petName}
        onChangeText={setPetName}
      />

      {petType ? (
        <>
          <Text style={styles.fieldLabel}>{t('petProfile.typeLabel')}</Text>
          <View style={styles.pickerCard}>
            <SettingsOptionPicker
              accessibilityLabel={t('petProfile.typeLabel')}
              options={petTypeOptions}
              selectedLabel={formatPetType(petType)}
              selectedValue={petType}
              onSelect={setPetType}
            />
          </View>
        </>
      ) : null}

      <Text style={styles.fieldLabel}>{t('petProfile.genderLabel')}</Text>
      <View style={styles.pickerCard}>
        <SettingsOptionPicker
          accessibilityLabel={t('petProfile.genderLabel')}
          options={genderOptions}
          selectedLabel={formatPetGenderLabel(selectedGender)}
          selectedValue={selectedGender}
          onSelect={setGender}
        />
      </View>

      <Text style={styles.fieldLabel}>{t('petProfile.birthdayLabel')}</Text>
      <PetBirthdayPicker value={birthday} onChange={setBirthday} />

      {saveStatus === 'saving' ? (
        <Text style={styles.mutedText}>{t('petProfile.autoSaving')}</Text>
      ) : null}
      {saveStatus === 'saved' ? (
        <Text style={styles.successText}>{t('petProfile.autoSaved')}</Text>
      ) : null}
      {saveStatus === 'error' ? (
        <Text style={styles.errorText}>{t('petProfile.saveFailed')}</Text>
      ) : null}
    </View>
  );
}

function formatPetGenderLabel(gender: LocalPetGender): string {
  switch (gender) {
    case 'female':
      return t('petProfile.genders.female');
    case 'male':
      return t('petProfile.genders.male');
    default:
      return t('petProfile.genders.unknown');
  }
}
