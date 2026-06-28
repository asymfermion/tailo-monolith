import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppTextInput } from '@/components/AppTextInput';
import { getDatabase } from '@/db';
import { getMomentPhotoChoices } from '@/db/profilePhotoSuggestion';

import { t, useAppLocale } from '@/i18n';
import { formatPetType } from '@/lib/formatMoment';
import { useAppearance, useThemedStyles } from '@/lib/appearance';
import { useNavigation } from '@/navigation/NavigationContext';
import { SettingsOptionPicker } from '@/screens/settings/SettingsOptionPicker';
import { mapMediaLibraryAssetToLocalAsset } from '@/modules/mediaScanner/assetMapper';
import {
  checkPhotoLibraryPermission,
  requestPhotoLibraryPermission,
} from '@/modules/mediaScanner/scanner';
import { canScanPhotos } from '@/modules/mediaScanner/permissions';

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
type ProfilePhotoChoice = {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
};
type PhotoPickerSource = 'album' | 'moments';

export function canSavePetProfileDraft(input: {
  name: string;
  type: LocalPetType | null;
}): boolean {
  return Boolean(input.name.trim() && input.type);
}

export function hasPetProfileDraftChanges(input: {
  profile: LocalPetProfile | null;
  name: string;
  type: LocalPetType | null;
  gender: LocalPetGender | null;
  birthday: string | null;
  profilePhotoLocalAssetId: string | null;
  profilePhotoUri: string | null;
}): boolean {
  const { profile } = input;

  if (!profile) {
    return false;
  }

  return (
    profile.name !== input.name.trim() ||
    profile.type !== input.type ||
    (profile.gender ?? null) !== input.gender ||
    (profile.birthday ?? null) !== input.birthday ||
    (profile.profilePhotoLocalAssetId ?? null) !==
      input.profilePhotoLocalAssetId ||
    (profile.profilePhotoUri ?? null) !== input.profilePhotoUri
  );
}

export function PetProfileEditor({
  profile,
  isLoading = false,
  onProfileSaved,
}: PetProfileEditorProps) {
  useAppLocale();
  const { colors } = useAppearance();
  const navigation = useNavigation();
  const styles = useThemedStyles(createPetProfileEditorStyles);
  const profilePetId = profile?.petId ?? null;
  const profileName = profile?.name ?? '';
  const profileType = profile?.type ?? null;
  const profileGender = profile?.gender ?? null;
  const profileBirthday = profile?.birthday ?? null;
  const profilePhotoAssetId = profile?.profilePhotoLocalAssetId ?? null;
  const profilePhotoPreviewUri = profile?.profilePhotoUri ?? null;
  const skipAutoSaveRef = useRef(true);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<LocalPetType | null>(null);
  const [gender, setGender] = useState<LocalPetGender | null>(null);
  const [birthday, setBirthday] = useState<string | null>(null);
  const [profilePhotoLocalAssetId, setProfilePhotoLocalAssetId] = useState<
    string | null
  >(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isPhotoSourceOpen, setIsPhotoSourceOpen] = useState(false);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [isLoadingPhotoChoices, setIsLoadingPhotoChoices] = useState(false);
  const [photoChoices, setPhotoChoices] = useState<ProfilePhotoChoice[]>([]);
  const [photoPickerSource, setPhotoPickerSource] =
    useState<PhotoPickerSource>('album');
  const [photoErrorMessage, setPhotoErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    skipAutoSaveRef.current = true;

    if (!profilePetId) {
      setPetName('');
      setPetType(null);
      setGender(null);
      setBirthday(null);
      setProfilePhotoLocalAssetId(null);
      setProfilePhotoUri(null);
      setSaveStatus('idle');
      return;
    }

    setPetName(profileName);
    setPetType(profileType);
    setGender(profileGender);
    setBirthday(profileBirthday);
    setProfilePhotoLocalAssetId(profilePhotoAssetId);
    setProfilePhotoUri(profilePhotoPreviewUri);
    setSaveStatus('idle');

    const frame = requestAnimationFrame(() => {
      skipAutoSaveRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [
    profileBirthday,
    profileGender,
    profileName,
    profilePetId,
    profilePhotoAssetId,
    profilePhotoPreviewUri,
    profileType,
  ]);

  const canSave = canSavePetProfileDraft({ name: petName, type: petType });
  const hasDraftChanges = hasPetProfileDraftChanges({
    profile,
    name: petName,
    type: petType,
    gender,
    birthday,
    profilePhotoLocalAssetId,
    profilePhotoUri,
  });

  const persistProfile = useCallback(async () => {
    if (!profile || !canSave || !petType || !hasDraftChanges) {
      return;
    }

    setSaveStatus('saving');

    try {
      await saveLocalPetProfile({
        name: petName,
        type: petType,
        gender,
        birthday,
        profilePhotoLocalAssetId,
        profilePhotoUri,
      });
      await onProfileSaved?.();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [
    birthday,
    canSave,
    gender,
    onProfileSaved,
    petName,
    petType,
    profile,
    profilePhotoLocalAssetId,
    profilePhotoUri,
    hasDraftChanges,
  ]);

  useEffect(() => {
    if (skipAutoSaveRef.current || !profile || !hasDraftChanges) {
      return;
    }

    const timer = setTimeout(() => {
      void persistProfile();
    }, 450);

    return () => clearTimeout(timer);
  }, [
    petName,
    petType,
    gender,
    birthday,
    persistProfile,
    profile,
    hasDraftChanges,
  ]);

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
  const previewUri = profilePhotoUri;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={t('petProfile.changePhoto')}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.avatarButton}
        onPress={() => setIsPhotoSourceOpen(true)}
      >
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
        <View style={styles.avatarBadge}>
          <Ionicons color={colors.accent} name="create-outline" size={16} />
        </View>
      </Pressable>
      <Text style={styles.avatarHint}>{t('petProfile.changePhoto')}</Text>

      <Text style={styles.fieldLabel}>{t('petProfile.nameLabel')}</Text>
      <AppTextInput
        autoCapitalize="words"
        autoCorrect={false}
        placeholder={t('onboarding.namePlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, focusedField === 'name' && styles.inputFocused]}
        value={petName}
        onChangeText={setPetName}
        onBlur={() => setFocusedField(null)}
        onFocus={() => setFocusedField('name')}
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
      {photoErrorMessage ? (
        <Text style={styles.errorText}>{photoErrorMessage}</Text>
      ) : null}

      <Modal
        animationType="slide"
        transparent
        visible={isPhotoSourceOpen}
        onRequestClose={() => setIsPhotoSourceOpen(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsPhotoSourceOpen(false)}
          />
          <View style={styles.photoSourceCard}>
            <Text style={styles.photoSourceTitle}>
              {t('petProfile.photoOptionsTitle')}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.photoSourceOption,
                pressed && styles.photoSourceOptionPressed,
              ]}
              onPress={() => {
                void openPhotoLibrary();
              }}
            >
              <Text style={styles.photoSourceOptionText}>
                {t('petProfile.chooseFromAlbum')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.photoSourceOption,
                pressed && styles.photoSourceOptionPressed,
              ]}
              onPress={() => {
                void openMomentPhotoPicker();
              }}
            >
              <Text style={styles.photoSourceOptionText}>
                {t('petProfile.chooseFromMoments')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.photoSourceOption,
                pressed && styles.photoSourceOptionPressed,
              ]}
              onPress={() => {
                setPhotoErrorMessage(null);
                setIsPhotoSourceOpen(false);
                navigation.push('Capture', { purpose: 'petProfilePhoto' });
              }}
            >
              <Text style={styles.photoSourceOptionText}>
                {t('petProfile.takePhoto')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.photoSourceOption,
                pressed && styles.photoSourceOptionPressed,
              ]}
              onPress={() => setIsPhotoSourceOpen(false)}
            >
              <Text style={styles.photoSourceOptionText}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isPhotoPickerOpen}
        onRequestClose={() => setIsPhotoPickerOpen(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsPhotoPickerOpen(false)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsPhotoPickerOpen(false)}
              >
                <Text style={styles.modalActionMuted}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Text style={styles.photoSourceTitle}>
                {photoPickerSource === 'moments'
                  ? t('petProfile.chooseFromMoments')
                  : t('petProfile.chooseFromAlbum')}
              </Text>
              <View style={{ width: 48 }} />
            </View>
            {isLoadingPhotoChoices ? (
              <Text style={[styles.mutedText, { marginHorizontal: 24 }]}>
                {t('onboarding.loadingPhotoOptions')}
              </Text>
            ) : photoChoices.length > 0 ? (
              <ScrollView
                contentContainerStyle={styles.photoGrid}
                showsVerticalScrollIndicator={false}
              >
                {photoChoices.map((choice) => (
                  <Pressable
                    accessibilityRole="button"
                    key={choice.localAssetId}
                    style={({ pressed }) => [
                      styles.photoGridItem,
                      pressed && styles.photoGridItemPressed,
                    ]}
                    onPress={() => {
                      setProfilePhotoLocalAssetId(choice.localAssetId);
                      setProfilePhotoUri(choice.uri);
                      setPhotoErrorMessage(null);
                      setSaveStatus('idle');
                      setIsPhotoPickerOpen(false);
                    }}
                  >
                    <Image
                      contentFit="cover"
                      source={{ uri: choice.uri }}
                      style={styles.photoGridImage}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.mutedText, { margin: 24 }]}>
                {photoPickerSource === 'moments'
                  ? t('petProfile.momentPhotoEmpty')
                  : t('petProfile.photoLibraryEmpty')}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );

  async function openPhotoLibrary() {
    setPhotoErrorMessage(null);
    setIsLoadingPhotoChoices(true);

    try {
      const permission = await checkPhotoLibraryPermission();
      const resolvedPermission = canScanPhotos(permission.status)
        ? permission
        : permission.canAskAgain || permission.status === 'undetermined'
          ? await requestPhotoLibraryPermission()
          : permission;

      if (!canScanPhotos(resolvedPermission.status)) {
        setPhotoErrorMessage(
          resolvedPermission.status === 'unavailable'
            ? t('petProfile.photoLibraryUnavailable')
            : t('petProfile.photoLibraryDenied'),
        );
        return;
      }

      const page = await MediaLibrary.getAssetsAsync({
        first: 24,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      const choices = page.assets.map((asset) => {
        const localAsset = mapMediaLibraryAssetToLocalAsset(asset);
        return {
          localAssetId: localAsset.localAssetId,
          uri: localAsset.uri,
          width: localAsset.width,
          height: localAsset.height,
        };
      });

      setPhotoPickerSource('album');
      setPhotoChoices(choices);
      setIsPhotoSourceOpen(false);
      setIsPhotoPickerOpen(true);
    } catch {
      setPhotoErrorMessage(t('errors.couldNotCheckPhotoAccess'));
    } finally {
      setIsLoadingPhotoChoices(false);
    }
  }

  async function openMomentPhotoPicker() {
    setPhotoErrorMessage(null);
    setIsLoadingPhotoChoices(true);

    try {
      const database = await getDatabase();
      const choices = await getMomentPhotoChoices(database, petType);

      setPhotoPickerSource('moments');
      setPhotoChoices(
        choices.map((choice) => ({
          localAssetId: choice.localAssetId,
          uri: choice.uri,
          width: choice.width,
          height: choice.height,
        })),
      );
      setIsPhotoSourceOpen(false);
      setIsPhotoPickerOpen(true);
    } catch {
      setPhotoErrorMessage(t('errors.couldNotLoadMoments'));
    } finally {
      setIsLoadingPhotoChoices(false);
    }
  }
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
