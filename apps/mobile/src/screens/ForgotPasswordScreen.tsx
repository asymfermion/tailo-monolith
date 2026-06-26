import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AuthBackButtonOverlay,
  AuthWordmarkBand,
} from '@/components/AuthHeader';
import { AuthFormTextInput } from '@/components/AuthFormTextInput';
import { FormErrorBanner } from '@/components/FormErrorBanner';
import { InputShell } from '@/components/InputShell';
import { spacing } from '@/constants/theme';
import { getFontFamilyForStyle } from '@/constants/typography';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { MIN_TOUCH_TARGET } from '@/lib/responsive';
import {
  getAuthHeaderMetrics,
  getForgotPasswordContentInset,
  getForgotPasswordLayoutMetrics,
  getForgotPasswordTitleMetrics,
} from '@/lib/authWelcomeLayout';
import {
  getAuthPasswordResetBlockReason,
  isAuthEmailSubmitReady,
  isAuthOtpSubmitReady,
  isAuthPasswordResetSubmitReady,
} from '@/lib/authFormReadiness';
import { useNavigation } from '@/navigation/NavigationContext';
import {
  finalizeConnectedSignIn,
  isValidAccountEmail,
  logAuth,
  normalizeAccountEmail,
  requestPasswordReset,
  setAccountPassword,
  verifyPasswordResetOtp,
} from '@/modules/auth';

type FormStep = 'email' | 'code' | 'password';

function createForgotPasswordScreenStyles({
  colors,
  getFontFamily,
  theme,
}: AppearanceContextValue) {
  const disabledPrimaryButtonColor = theme === 'dark' ? '#6E6862' : '#A69B8F';

  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
    },
    shell: {
      alignSelf: 'center' as const,
      maxWidth: 520,
      width: '100%' as const,
    },
    headlineBlock: {
      alignSelf: 'stretch' as const,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamilyForStyle('elegant', '500'),
      fontSize: 42,
      fontWeight: '500' as const,
      lineHeight: 45,
      textAlign: 'left' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'left' as const,
    },
    bodyEmail: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 15,
      fontWeight: '500' as const,
      lineHeight: 22,
      textAlign: 'left' as const,
    },
    form: {
      alignSelf: 'stretch' as const,
    },
    labelRow: {
      marginBottom: spacing.xs,
    },
    fieldLabel: {
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      fontWeight: '400' as const,
    },
    quietLinkAction: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: spacing.md,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    quietLinkText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      textDecorationLine: 'underline' as const,
    },
    input: {
      color: colors.text,
      fontFamily: getFontFamily('400'),
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: 0,
    },
    primaryButton: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: colors.text,
      borderRadius: 999,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    primaryButtonDisabled: {
      backgroundColor: disabledPrimaryButtonColor,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 21,
    },
    primaryButtonTextDisabled: {
      color: colors.surface,
      opacity: 0.82,
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
  const { height, width } = useWindowDimensions();
  const navigation = useNavigation();
  const [step, setStep] = useState<FormStep>('email');
  const emailRef = useRef('');
  const codeRef = useRef('');
  const passwordRef = useRef('');
  const confirmPasswordRef = useRef('');
  const [codeEmail, setCodeEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<TextInput>(null);
  const codeInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createForgotPasswordScreenStyles);
  const layoutMetrics = getForgotPasswordLayoutMetrics(height);
  const headerMetrics = getAuthHeaderMetrics(insets.top, 'utility');
  const contentInset = getForgotPasswordContentInset(
    height,
    insets.top,
    insets.bottom,
    headerMetrics.totalHeight,
    layoutMetrics,
  );
  const titleMetrics = getForgotPasswordTitleMetrics(
    width,
    layoutMetrics.bucket,
  );
  const scrollMinHeight = Math.max(
    height - insets.top - insets.bottom,
    layoutMetrics.bucket === 'short' ? 520 : 600,
  );
  const handleEmailChange = useCallback((value: string) => {
    setErrorField((field) => (field === 'email' ? null : field));
    setEmailInput(value);
  }, []);
  const handleCodeChange = useCallback((value: string) => {
    setErrorField((field) => (field === 'code' ? null : field));
    setCodeInput(value);
  }, []);
  const handlePasswordChange = useCallback((value: string) => {
    setErrorField((field) => (field === 'password' ? null : field));
    setPasswordInput(value);
  }, []);
  const handleConfirmPasswordChange = useCallback((value: string) => {
    setErrorField((field) => (field === 'confirmPassword' ? null : field));
    setConfirmPasswordInput(value);
  }, []);
  const isEmailStepReady = isAuthEmailSubmitReady(emailInput);
  const isCodeStepReady = codeInput.trim().length === 8;
  const isPasswordStepReady = isAuthPasswordResetSubmitReady(
    passwordInput,
    confirmPasswordInput,
  );

  async function handleSendCode() {
    setErrorMessage(null);
    const email = emailRef.current;

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      setErrorField('email');
      emailInputRef.current?.focus();
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

    if (!isAuthOtpSubmitReady(code)) {
      setErrorMessage(t('account.errors.codeRequired'));
      setErrorField('code');
      codeInputRef.current?.focus();
      return;
    }

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

    if (!isAuthPasswordResetSubmitReady(password, confirmPassword)) {
      const blockReason = getAuthPasswordResetBlockReason(
        password,
        confirmPassword,
      );
      const nextErrorField =
        blockReason === 'mismatch' ? 'confirmPassword' : 'password';

      setErrorMessage(
        blockReason === 'mismatch'
          ? t('account.errors.passwordMismatch')
          : t('account.errors.passwordWeak'),
      );
      setErrorField(nextErrorField);
      if (nextErrorField === 'confirmPassword') {
        confirmPasswordInputRef.current?.focus();
      } else {
        passwordInputRef.current?.focus();
      }
      return;
    }

    const trimmedPassword = password.trim();

    setIsSubmitting(true);
    logAuth('Forgot password: saving new password', {
      email: normalizeAccountEmail(email),
    });

    const setResult = await setAccountPassword(trimmedPassword);

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
    <View style={styles.screen}>
      <AuthBackButtonOverlay onBack={onBack} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          {
            minHeight: scrollMinHeight,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
      >
        <AuthWordmarkBand variant="utility" />
        <View style={[styles.shell, { paddingTop: contentInset }]}>
          <View style={styles.headlineBlock}>
            {step === 'code' ? (
              <>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.9}
                  numberOfLines={1}
                  style={[
                    styles.title,
                    {
                      fontSize: titleMetrics.fontSize,
                      lineHeight: titleMetrics.lineHeight,
                    },
                  ]}
                >
                  {t('signIn.forgotPasswordCodeTitle')}
                </Text>
                <Text
                  style={[
                    styles.body,
                    { marginTop: layoutMetrics.titleToCopyGap },
                  ]}
                >
                  {t('signIn.forgotPasswordCodeBodyPrefix')}
                </Text>
                <Text
                  accessibilityLabel={codeEmail}
                  style={[styles.bodyEmail, { marginTop: spacing.xs }]}
                >
                  {codeEmail}.
                </Text>
              </>
            ) : (
              <>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.9}
                  numberOfLines={1}
                  style={[
                    styles.title,
                    {
                      fontSize: titleMetrics.fontSize,
                      lineHeight: titleMetrics.lineHeight,
                    },
                  ]}
                >
                  {t('signIn.forgotPasswordTitle')}
                </Text>
                {step === 'email' ? (
                  <Text
                    style={[
                      styles.body,
                      { marginTop: layoutMetrics.titleToCopyGap },
                    ]}
                  >
                    {t('signIn.forgotPasswordBody')}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          {step === 'email' ? (
            <View
              style={[styles.form, { marginTop: layoutMetrics.copyToFormGap }]}
            >
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>
                  {t('signIn.emailAddressLabel')}
                </Text>
              </View>
              <InputShell
                hasError={errorField === 'email'}
                isFocused={focusedField === 'email'}
                minHeight={layoutMetrics.inputHeight}
              >
                <AuthFormTextInput
                  ref={emailInputRef}
                  kind="email"
                  blurOnSubmit={false}
                  keyboardDismissAccessory={false}
                  placeholder={t('account.emailPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  style={[
                    styles.input,
                    { minHeight: layoutMetrics.inputHeight - 2 },
                  ]}
                  valueRef={emailRef}
                  onValueChange={handleEmailChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => void handleSendCode()}
                />
              </InputShell>
              {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
              <PrimaryButton
                disabled={isSubmitting || !isEmailStepReady}
                label={
                  isSubmitting
                    ? t('account.sendingCode')
                    : t('signIn.forgotPasswordSendCode')
                }
                minHeight={layoutMetrics.primaryButtonHeight}
                style={{ marginTop: layoutMetrics.inputToButtonGap }}
                onPress={() => void handleSendCode()}
              />
            </View>
          ) : step === 'code' ? (
            <View
              style={[styles.form, { marginTop: layoutMetrics.copyToFormGap }]}
            >
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>{t('account.codeLabel')}</Text>
              </View>
              <InputShell
                hasError={errorField === 'code'}
                isFocused={focusedField === 'code'}
                minHeight={layoutMetrics.inputHeight}
              >
                <AuthFormTextInput
                  key="password-reset-code"
                  ref={codeInputRef}
                  kind="code"
                  accessibilityHint={t('account.codePlaceholder')}
                  accessibilityLabel={t('account.codeLabel')}
                  autoFocus
                  placeholder={t('account.codePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    { minHeight: layoutMetrics.inputHeight - 2 },
                  ]}
                  valueRef={codeRef}
                  onValueChange={handleCodeChange}
                  onFocus={() => setFocusedField('code')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => void handleVerifyCode()}
                />
              </InputShell>
              {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
              <PrimaryButton
                disabled={isSubmitting || !isCodeStepReady}
                label={
                  isSubmitting
                    ? t('account.verifying')
                    : t('signIn.forgotPasswordVerifyCode')
                }
                minHeight={layoutMetrics.primaryButtonHeight}
                style={{ marginTop: layoutMetrics.inputToButtonGap }}
                onPress={() => void handleVerifyCode()}
              />
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('account.useDifferentEmail')}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                style={styles.quietLinkAction}
                onPress={() => {
                  setStep('email');
                  codeRef.current = '';
                  setCodeInput('');
                  setErrorMessage(null);
                }}
              >
                <Text style={styles.quietLinkText}>
                  {t('account.useDifferentEmail')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[styles.form, { marginTop: layoutMetrics.copyToFormGap }]}
            >
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>
                  {t('account.passwordLabel')}
                </Text>
              </View>
              <InputShell
                hasError={errorField === 'password'}
                isFocused={focusedField === 'password'}
                minHeight={layoutMetrics.inputHeight}
              >
                <AuthFormTextInput
                  key="password-reset-new-password"
                  ref={passwordInputRef}
                  kind="newPassword"
                  autoFocus
                  blurOnSubmit={false}
                  keyboardDismissAccessory={false}
                  placeholder={t('account.passwordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  style={[
                    styles.input,
                    { minHeight: layoutMetrics.inputHeight - 2 },
                  ]}
                  valueRef={passwordRef}
                  onValueChange={handlePasswordChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() =>
                    confirmPasswordInputRef.current?.focus()
                  }
                />
              </InputShell>
              <View
                style={[
                  styles.labelRow,
                  { marginTop: layoutMetrics.formFieldGap },
                ]}
              >
                <Text style={styles.fieldLabel}>
                  {t('account.confirmPasswordLabel')}
                </Text>
              </View>
              <InputShell
                hasError={errorField === 'confirmPassword'}
                isFocused={focusedField === 'confirmPassword'}
                minHeight={layoutMetrics.inputHeight}
              >
                <AuthFormTextInput
                  ref={confirmPasswordInputRef}
                  kind="confirmPassword"
                  keyboardDismissAccessory={false}
                  placeholder={t('account.confirmPasswordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  style={[
                    styles.input,
                    { minHeight: layoutMetrics.inputHeight - 2 },
                  ]}
                  valueRef={confirmPasswordRef}
                  onValueChange={handleConfirmPasswordChange}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => void handleSavePassword()}
                />
              </InputShell>
              {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
              <PrimaryButton
                disabled={isSubmitting || !isPasswordStepReady}
                label={
                  isSubmitting
                    ? t('signIn.forgotPasswordSaving')
                    : t('signIn.forgotPasswordSave')
                }
                minHeight={layoutMetrics.primaryButtonHeight}
                style={{ marginTop: layoutMetrics.inputToButtonGap }}
                onPress={() => void handleSavePassword()}
              />
            </View>
          )}

          {isSubmitting ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  minHeight,
  onPress,
  style,
}: {
  disabled: boolean;
  label: string;
  minHeight?: number;
  onPress: () => void;
  style?: { marginTop?: number };
}) {
  const styles = useThemedStyles(createForgotPasswordScreenStyles);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[
        styles.primaryButton,
        minHeight ? { minHeight } : null,
        style,
        disabled && styles.primaryButtonDisabled,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.primaryButtonText,
          disabled && styles.primaryButtonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
