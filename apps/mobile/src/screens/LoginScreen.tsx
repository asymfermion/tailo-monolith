import { useCallback, useRef, useState } from 'react';
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
import { SocialSignInPlaceholders } from '@/components/SocialSignInPlaceholders';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import {
  isAuthEmailSubmitReady,
  isAuthOtpSubmitReady,
  isAuthPasswordSubmitReady,
} from '@/lib/authFormReadiness';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import {
  getModalHeaderTopInset,
  getTabScreenTopPadding,
} from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import {
  isRemoteAuthConfigured,
  isValidAccountEmail,
  logAuth,
  normalizeAccountEmail,
  requestSignInOtp,
  signInWithPassword,
  verifySignInOtp,
} from '@/modules/auth';

type FormStep = 'password' | 'code';

function createLoginScreenStyles({
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

type LoginScreenProps = {
  onSignedIn: () => void;
  onCancel?: () => void;
  variant?: 'welcome' | 'locked';
};

export function LoginScreen({
  onCancel,
  onSignedIn,
  variant = 'locked',
}: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [step, setStep] = useState<FormStep>('password');
  const [prefersCodeSignIn, setPrefersCodeSignIn] = useState(false);
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const codeRef = useRef('');
  const [codeEmail, setCodeEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signInInFlightRef = useRef(false);
  const passwordInputRef = useRef<TextInput>(null);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createLoginScreenStyles);
  const handleEmailChange = useCallback((value: string) => {
    setEmailInput(value);
  }, []);
  const handlePasswordChange = useCallback((value: string) => {
    setPasswordInput(value);
  }, []);
  const handleCodeChange = useCallback((value: string) => {
    setCodeInput(value);
  }, []);
  const isPasswordStepReady =
    isAuthEmailSubmitReady(emailInput) &&
    (prefersCodeSignIn || isAuthPasswordSubmitReady(passwordInput));
  const isCodeStepReady = isAuthOtpSubmitReady(codeInput);

  async function handleSendCode() {
    setErrorMessage(null);
    const email = emailRef.current;

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);
    const result = await requestSignInOtp(email);
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

  async function handlePasswordSignIn() {
    if (signInInFlightRef.current) {
      return;
    }

    setErrorMessage(null);
    const email = emailRef.current;

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      return;
    }

    const password = passwordRef.current;

    if (!isAuthPasswordSubmitReady(password)) {
      setErrorMessage(t('signIn.errors.passwordRequired'));
      return;
    }

    signInInFlightRef.current = true;
    setIsSubmitting(true);

    try {
      logAuth('Login screen: password sign-in submitted', {
        email: normalizeAccountEmail(email),
      });
      const result = await signInWithPassword(email, password);
      logAuth('Login screen: password sign-in returned', {
        status: result.status,
      });

      if (result.status === 'skipped') {
        setErrorMessage(t('account.errors.unavailable'));
        return;
      }

      if (result.status === 'error') {
        setErrorMessage(result.message);
        return;
      }

      logAuth('Login screen: sign-in finished — dismissing auth UI');
      navigation.finishSignInToTimeline();
      onSignedIn();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not sign in. Try again.';
      logAuth('Login screen: password sign-in threw', { message });
      setErrorMessage(message);
    } finally {
      signInInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (signInInFlightRef.current) {
      return;
    }

    setErrorMessage(null);
    const email = emailRef.current;
    const code = codeRef.current;

    if (!isAuthOtpSubmitReady(code)) {
      setErrorMessage(t('account.errors.codeRequired'));
      return;
    }

    signInInFlightRef.current = true;
    setIsSubmitting(true);

    try {
      logAuth('Login screen: OTP verification submitted', {
        email: normalizeAccountEmail(email),
      });

      const result = await verifySignInOtp(email, code);
      logAuth('Login screen: OTP verification returned', {
        status: result.status,
      });

      if (result.status === 'skipped') {
        setErrorMessage(t('account.errors.unavailable'));
        return;
      }

      if (result.status === 'error') {
        setErrorMessage(result.message);
        return;
      }

      logAuth('Login screen: sign-in finished — dismissing auth UI');
      navigation.finishSignInToTimeline();
      onSignedIn();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not sign in. Try again.';
      logAuth('Login screen: OTP verification threw', { message });
      setErrorMessage(message);
    } finally {
      signInInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: onCancel
            ? getModalHeaderTopInset(insets.top)
            : getTabScreenTopPadding(insets.top),
        },
      ]}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      {onCancel ? (
        <View style={styles.modalHeader}>
          <ModalBackButton align="leading" onPress={onCancel} />
        </View>
      ) : null}

      <Text style={styles.title}>
        {variant === 'welcome' ? t('signIn.welcomeTitle') : t('signIn.title')}
      </Text>
      <Text style={styles.body}>
        {variant === 'welcome' ? t('signIn.welcomeBody') : t('signIn.body')}
      </Text>

      {step === 'password' ? (
        <>
          <Text style={styles.fieldLabel}>{t('account.emailLabel')}</Text>
          <AuthFormTextInput
            kind="email"
            blurOnSubmit={false}
            placeholder={t('account.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType={prefersCodeSignIn ? 'done' : 'next'}
            style={styles.input}
            valueRef={emailRef}
            onValueChange={handleEmailChange}
            onSubmitEditing={() => {
              if (prefersCodeSignIn) {
                void handleSendCode();
                return;
              }

              passwordInputRef.current?.focus();
            }}
          />
          {prefersCodeSignIn ? null : (
            <>
              <Text style={styles.fieldLabel}>
                {t('account.passwordLabel')}
              </Text>
              <AuthFormTextInput
                ref={passwordInputRef}
                kind="password"
                placeholder={t('signIn.passwordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                style={styles.input}
                valueRef={passwordRef}
                onValueChange={handlePasswordChange}
                onSubmitEditing={() => void handlePasswordSignIn()}
              />
            </>
          )}
          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
          <PrimaryButton
            disabled={isSubmitting || !isPasswordStepReady}
            label={
              isSubmitting
                ? prefersCodeSignIn
                  ? t('account.sendingCode')
                  : t('signIn.signingIn')
                : prefersCodeSignIn
                  ? t('signIn.sendCode')
                  : t('signIn.signIn')
            }
            onPress={() =>
              void (prefersCodeSignIn
                ? handleSendCode()
                : handlePasswordSignIn())
            }
          />
          <SocialSignInPlaceholders />
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            style={styles.secondaryAction}
            onPress={() => {
              setErrorMessage(null);
              passwordRef.current = '';
              setPasswordInput('');

              if (prefersCodeSignIn) {
                setPrefersCodeSignIn(false);
                return;
              }

              setPrefersCodeSignIn(true);
            }}
          >
            <Text style={styles.secondaryActionText}>
              {prefersCodeSignIn
                ? t('signIn.usePasswordInstead')
                : t('signIn.useCodeInstead')}
            </Text>
          </Pressable>
          {prefersCodeSignIn ? null : (
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryAction}
              onPress={() => navigation.push('ForgotPassword', undefined)}
            >
              <Text style={styles.secondaryActionText}>
                {t('signIn.forgotPassword')}
              </Text>
            </Pressable>
          )}
        </>
      ) : (
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
            onValueChange={handleCodeChange}
          />
          {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
          <PrimaryButton
            disabled={isSubmitting || !isCodeStepReady}
            label={
              isSubmitting ? t('account.verifying') : t('signIn.verifyCode')
            }
            onPress={() => void handleVerifyCode()}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.secondaryAction}
            onPress={() => {
              setStep('password');
              setPrefersCodeSignIn(false);
              codeRef.current = '';
              setCodeInput('');
              setErrorMessage(null);
            }}
          >
            <Text style={styles.secondaryActionText}>
              {t('signIn.usePasswordInstead')}
            </Text>
          </Pressable>
        </>
      )}

      {isRemoteAuthConfigured() ? (
        <Pressable
          accessibilityRole="button"
          style={styles.secondaryAction}
          onPress={() =>
            navigation.push('AccountSettings', {
              mode: 'create',
              signInPresentation: 'pop',
            })
          }
        >
          <Text style={styles.secondaryActionText}>
            {t('common.createAccount')}
          </Text>
        </Pressable>
      ) : null}

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
  const styles = useThemedStyles(createLoginScreenStyles);

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
