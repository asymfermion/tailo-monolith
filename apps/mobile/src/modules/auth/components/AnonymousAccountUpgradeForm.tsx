import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthFormTextInput } from '@/components/AuthFormTextInput';
import { SocialSignInPlaceholders } from '@/components/SocialSignInPlaceholders';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useAppearance, useThemedStyles } from '@/lib/appearance';
import { useNavigation } from '@/navigation/NavigationContext';
import {
  isValidAccountEmail,
  normalizeAccountEmail,
  requestEmailLink,
  requestEmailSignUp,
  useAuthAccountStatus,
  verifyEmailLink,
  verifyEmailSignUp,
} from '@/modules/auth';
import { createAccountSettingsStyles } from './accountSettingsStyles';

type FormStep = 'email' | 'code';

type AnonymousAccountUpgradeFormProps = {
  mode: 'link' | 'create';
  signInPresentation?: 'pop';
  onLinked: () => void;
};

export function AnonymousAccountUpgradeForm({
  mode,
  signInPresentation,
  onLinked,
}: AnonymousAccountUpgradeFormProps) {
  const navigation = useNavigation();
  const account = useAuthAccountStatus();
  const [step, setStep] = useState<FormStep>('email');
  const emailRef = useRef('');
  const codeRef = useRef('');
  const [codeEmail, setCodeEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createAccountSettingsStyles);

  async function handleSendCode() {
    setErrorMessage(null);
    const email = emailRef.current;

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);
    const result =
      mode === 'create'
        ? await requestEmailSignUp(email)
        : await requestEmailLink(email);
    setIsSubmitting(false);

    if (result.status === 'skipped') {
      setErrorMessage(t('account.unavailableBody'));
      return;
    }

    if (result.status === 'already_linked') {
      await account.refresh();
      onLinked();
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      return;
    }

    setCodeEmail(normalizeAccountEmail(email));
    setStep('code');
  }

  async function handleVerifyCode() {
    setErrorMessage(null);
    const email = emailRef.current;
    const code = codeRef.current;
    setIsSubmitting(true);

    const result =
      mode === 'create'
        ? await verifyEmailSignUp(email, code)
        : await verifyEmailLink(email, code);

    setIsSubmitting(false);

    if (result.status === 'skipped') {
      setErrorMessage(t('account.unavailableBody'));
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      return;
    }

    await account.refresh();
    onLinked();
  }

  return (
    <>
      <Text style={styles.title}>
        {mode === 'create' ? t('account.createTitle') : t('account.title')}
      </Text>
      <Text style={styles.body}>
        {mode === 'create' ? t('account.createBody') : t('account.body')}
      </Text>

      {mode !== 'create' ? (
        <View style={styles.profileCard}>
          <View style={[styles.profileRow, styles.profileRowLast]}>
            <Text style={styles.profileLabel}>
              {t('account.profileStatusLabel')}
            </Text>
            <Text style={styles.profileValue}>
              {t('account.profileStatusAnonymous')}
            </Text>
          </View>
        </View>
      ) : null}

      {step === 'email' ? (
        <>
          <Text style={styles.fieldLabel}>{t('account.emailLabel')}</Text>
          <AuthFormTextInput
            kind="email"
            placeholder={t('account.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            valueRef={emailRef}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting ? t('account.sendingCode') : t('account.sendCode')
            }
            onPress={() => void handleSendCode()}
            styles={styles}
          />
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>{t('account.codeLabel')}</Text>
          <Text style={styles.body}>
            {t('account.codeHint', { email: codeEmail })}
          </Text>
          <AuthFormTextInput
            kind="code"
            placeholder={t('account.codePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            valueRef={codeRef}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting ? t('account.verifying') : t('account.verifyCode')
            }
            onPress={() => void handleVerifyCode()}
            styles={styles}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.secondaryAction}
            onPress={() => {
              setStep('email');
              codeRef.current = '';
              setErrorMessage(null);
            }}
          >
            <Text style={styles.secondaryActionText}>
              {t('account.useDifferentEmail')}
            </Text>
          </Pressable>
        </>
      )}

      <SocialSignInPlaceholders style={{ marginTop: spacing.lg }} />
      <Pressable
        accessibilityRole="button"
        style={styles.secondaryAction}
        onPress={() => {
          if (signInPresentation === 'pop') {
            navigation.pop();
            return;
          }

          navigation.push('Login', { variant: 'welcome' });
        }}
      >
        <Text style={styles.secondaryActionText}>
          {t('common.alreadyHaveAccountSignIn')}
        </Text>
      </Pressable>

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
