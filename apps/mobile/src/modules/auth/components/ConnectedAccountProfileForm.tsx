import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { AppTextInput } from '@/components/AppTextInput';
import { getAuthFormFieldProps } from '@/components/authFormFieldProps';
import { spacing } from '@/constants/theme';
import { getAppLocale } from '@/i18n/locale';
import { t } from '@/i18n';
import { getAppFontStyle } from '@/lib/appFontStyle';
import { getAppTheme } from '@/lib/appTheme';
import { useAppearance, useThemedStyles } from '@/lib/appearance';
import {
  isLinkedRemoteAccount,
  setAccountPassword,
  useAuthAccountStatus,
} from '@/modules/auth';
import { saveAccountProfile } from '@/modules/auth/persistAccountProfile';
import { useRemoteAccountProfile } from '@/modules/auth/useRemoteAccountProfile';

import { UserProfileHeader } from './UserProfileHeader';
import { createAccountSettingsStyles } from './accountSettingsStyles';

const MIN_PASSWORD_LENGTH = 8;

type ProfileSubview = 'profile' | 'password';

type ConnectedAccountProfileFormProps = {
  mode: 'link' | 'create';
  /** After direct account creation, offer optional password setup once. */
  preferPasswordSetup?: boolean;
};

export function ConnectedAccountProfileForm({
  mode,
  preferPasswordSetup = false,
}: ConnectedAccountProfileFormProps) {
  const account = useAuthAccountStatus();
  const {
    profile,
    isLoading: isProfileLoading,
    refresh,
  } = useRemoteAccountProfile();
  const [subview, setSubview] = useState<ProfileSubview>('profile');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createAccountSettingsStyles);

  const session = account.session;
  const isLinked = isLinkedRemoteAccount(session);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName ?? '');
  }, [profile?.appUserId, profile?.displayName]);

  useEffect(() => {
    if (preferPasswordSetup) {
      setSubview('password');
    }
  }, [preferPasswordSetup]);

  async function handleSaveProfile() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await saveAccountProfile({
      displayName: displayName.trim() || null,
      preferredLocale: getAppLocale(),
      preferredTheme: getAppTheme(),
      preferredFontStyle: getAppFontStyle(),
    });

    setIsSubmitting(false);

    if (result.status === 'error') {
      setErrorMessage(
        result.localSaved
          ? t('account.errors.profileSavedLocalOnly', {
              message: result.message,
            })
          : result.message,
      );
      await refresh();
      return;
    }

    if (result.status === 'saved_local') {
      await refresh();
      setSuccessMessage(t('account.profileSaved'));
      return;
    }

    if (result.status === 'not_linked' || result.status === 'skipped') {
      setErrorMessage(t('account.errors.profileSyncFailed'));
      return;
    }

    await refresh();
    await account.refresh();
    setSuccessMessage(t('account.profileSaved'));
  }

  async function handleSavePassword() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        t('account.errors.passwordTooShort', {
          min: MIN_PASSWORD_LENGTH,
        }),
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('account.errors.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    const result = await setAccountPassword(password);
    setIsSubmitting(false);

    if (result.status === 'skipped') {
      setErrorMessage(t('account.errors.unavailable'));
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setSubview('profile');
    setSuccessMessage(t('account.passwordSaved'));
  }

  if (!isLinked) {
    return null;
  }

  if (subview === 'password') {
    return (
      <>
        <Text style={styles.title}>{t('account.passwordSetupTitle')}</Text>
        <Text style={styles.body}>{t('account.passwordSetupBody')}</Text>
        <Text style={styles.fieldLabel}>{t('account.passwordLabel')}</Text>
        <AppTextInput
          {...getAuthFormFieldProps('newPassword')}
          blurOnSubmit={false}
          placeholder={t('account.passwordPlaceholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        <Text style={styles.fieldLabel}>
          {t('account.confirmPasswordLabel')}
        </Text>
        <AppTextInput
          {...getAuthFormFieldProps('confirmPassword')}
          placeholder={t('account.confirmPasswordPlaceholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <PrimaryButton
          disabled={isSubmitting}
          label={
            isSubmitting
              ? t('account.savingPassword')
              : t('account.savePassword')
          }
          onPress={() => void handleSavePassword()}
          styles={styles}
        />
        <Pressable
          accessibilityRole="button"
          style={styles.secondaryAction}
          onPress={() => {
            setPassword('');
            setConfirmPassword('');
            setErrorMessage(null);
            setSubview('profile');
          }}
        >
          <Text style={styles.secondaryActionText}>
            {t('account.backToProfile')}
          </Text>
        </Pressable>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Text style={styles.title}>{t('userProfile.title')}</Text>
      <UserProfileHeader
        displayName={displayName.trim() || profile?.displayName || null}
        email={session?.email ?? null}
        subtitle={
          mode === 'create'
            ? t('account.createdBody')
            : t('userProfile.subtitle')
        }
      />

      {isProfileLoading ? (
        <ActivityIndicator
          color={colors.accent}
          style={{ marginTop: spacing.lg }}
        />
      ) : (
        <>
          <Text style={styles.fieldLabel}>
            {t('account.profileDisplayNameLabel')}
          </Text>
          <AppTextInput
            autoCapitalize="words"
            autoCorrect={false}
            placeholder={t('account.profileDisplayNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting
                ? t('account.savingProfile')
                : t('account.saveProfile')
            }
            onPress={() => void handleSaveProfile()}
            styles={styles}
          />
        </>
      )}

      <Pressable
        accessibilityRole="button"
        style={styles.secondaryAction}
        onPress={() => {
          setErrorMessage(null);
          setSuccessMessage(null);
          setSubview('password');
        }}
      >
        <Text style={styles.secondaryActionText}>
          {t('account.addPasswordLater')}
        </Text>
      </Pressable>

      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
  styles,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createAccountSettingsStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}
