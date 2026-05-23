import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthFormTextInput } from '@/components/AuthFormTextInput';
import { FormErrorBanner } from '@/components/FormErrorBanner';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { useNavigation } from '@/navigation/NavigationContext';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';
import {
  finalizeConnectedSignIn,
  isValidAccountEmail,
  logAuth,
  normalizeAccountEmail,
  requestPasswordReset,
  setAccountPassword,
  verifyPasswordResetOtp,
} from '@/modules/auth';

const MIN_PASSWORD_LENGTH = 8;

type FormStep = 'email' | 'code' | 'password';

function createForgotPasswordScreenStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
    },
    modalHeader: {
      marginBottom: spacing.lg,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 28,
      fontWeight: '600' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.sm,
    },
    fieldLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    codeHint: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    primaryButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 12,
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    secondaryAction: {
      alignItems: 'center' as const,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    secondaryActionText: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
  };
}

type ForgotPasswordScreenProps = {
  onBack: () => void;
  onSignedIn: () => void;
};

export function ForgotPasswordScreen({
  onBack,
  onSignedIn,
}: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [step, setStep] = useState<FormStep>('email');
  const emailRef = useRef('');
  const codeRef = useRef('');
  const passwordRef = useRef('');
  const confirmPasswordRef = useRef('');
  const [codeEmail, setCodeEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createForgotPasswordScreenStyles);

  async function handleSendCode() {
    setErrorMessage(null);
    const email = emailRef.current;

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);
    const result = await requestPasswordReset(email);
    setIsSubmitting(false);

    if (result.status === 'skipped') {
      setErrorMessage(t('account.errors.unavailable'));
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

    const result = await verifyPasswordResetOtp(email, code);

    setIsSubmitting(false);

    if (result.status === 'skipped') {
      setErrorMessage(t('account.errors.unavailable'));
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      return;
    }

    setStep('password');
  }

  async function handleSavePassword() {
    setErrorMessage(null);
    const email = emailRef.current;
    const password = passwordRef.current;
    const confirmPassword = confirmPasswordRef.current;

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
    logAuth('Forgot password: saving new password', {
      email: normalizeAccountEmail(email),
    });

    const setResult = await setAccountPassword(password);

    if (setResult.status === 'skipped') {
      setIsSubmitting(false);
      setErrorMessage(t('account.errors.unavailable'));
      return;
    }

    if (setResult.status === 'error') {
      setIsSubmitting(false);
      setErrorMessage(setResult.message);
      return;
    }

    try {
      logAuth('Forgot password: finalizing session after password reset');
      await finalizeConnectedSignIn('password_reset');
      logAuth('Forgot password: session established — dismissing auth UI');
      navigation.finishSignInToTimeline();
      onSignedIn();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not finish signing in. Try again.';
      logAuth('Forgot password: finalize session threw', { message });
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: getModalHeaderTopInset(insets.top) },
      ]}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      <View style={styles.modalHeader}>
        <ModalBackButton align="leading" onPress={onBack} />
      </View>

      <Text style={styles.title}>{t('signIn.forgotPasswordTitle')}</Text>
      <Text style={styles.body}>{t('signIn.forgotPasswordBody')}</Text>

      {step === 'email' ? (
        <>
          <Text style={styles.fieldLabel}>{t('account.emailLabel')}</Text>
          <AuthFormTextInput
            kind="email"
            blurOnSubmit={false}
            placeholder={t('account.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            valueRef={emailRef}
            onSubmitEditing={() => void handleSendCode()}
          />
          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting
                ? t('account.sendingCode')
                : t('signIn.forgotPasswordSendCode')
            }
            onPress={() => void handleSendCode()}
          />
        </>
      ) : step === 'code' ? (
        <>
          <Text style={styles.fieldLabel}>{t('account.codeLabel')}</Text>
          <Text style={styles.codeHint}>
            {t('account.codeHint', { email: codeEmail })}
          </Text>
          <AuthFormTextInput
            kind="code"
            placeholder={t('account.codePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            valueRef={codeRef}
          />
          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting
                ? t('account.verifying')
                : t('signIn.forgotPasswordVerifyCode')
            }
            onPress={() => void handleVerifyCode()}
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
      ) : (
        <>
          <Text style={styles.fieldLabel}>{t('account.passwordLabel')}</Text>
          <AuthFormTextInput
            ref={passwordInputRef}
            kind="newPassword"
            blurOnSubmit={false}
            placeholder={t('account.passwordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            valueRef={passwordRef}
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          />
          <Text style={styles.fieldLabel}>
            {t('account.confirmPasswordLabel')}
          </Text>
          <AuthFormTextInput
            ref={confirmPasswordInputRef}
            kind="confirmPassword"
            placeholder={t('account.confirmPasswordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            valueRef={confirmPasswordRef}
            onSubmitEditing={() => void handleSavePassword()}
          />
          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting
                ? t('signIn.forgotPasswordSaving')
                : t('signIn.forgotPasswordSave')
            }
            onPress={() => void handleSavePassword()}
          />
        </>
      )}

      {isSubmitting ? (
        <ActivityIndicator
          color={colors.accent}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </ScrollView>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createForgotPasswordScreenStyles);

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
