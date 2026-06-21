import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHeroCollage, AuthLegalCopy } from '@/components/AuthBranding';
import { AuthBackButtonOverlay } from '@/components/AuthHeader';
import { AuthFormTextInput } from '@/components/AuthFormTextInput';
import { FormErrorBanner } from '@/components/FormErrorBanner';
import { SocialSignInControls } from '@/components/SocialSignInControls';
import { spacing } from '@/constants/theme';
import { getFontFamilyForStyle } from '@/constants/typography';
import { t } from '@/i18n';
import {
  getAuthHeroScrollPaddingTop,
  getAuthTitleMetrics,
  getLoginLayoutMetrics,
  getWelcomeLayoutMetrics,
} from '@/lib/authWelcomeLayout';
import { MIN_TOUCH_TARGET } from '@/lib/responsive';
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
import {
  handleLoginSocialSignInResult,
  runSocialSignIn,
  type SocialSignInProvider,
} from '@/modules/auth/socialSignInFlow';
import { useBlockingAuthAction } from '@/modules/auth/useBlockingAuthAction';

type FormStep = 'password' | 'code';

const SIGN_IN_CODE_RESEND_COOLDOWN_SECONDS = 60;

function createLoginScreenStyles({
  colors,
  getFontFamily,
  theme,
}: AppearanceContextValue) {
  const disabledPrimaryButtonColor = theme === 'dark' ? '#6E6862' : '#A69B8F';
  const disabledCodeLinkColor = theme === 'dark' ? '#8A837C' : '#9A8F83';

  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      alignItems: 'center' as const,
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
    },
    shell: {
      flex: 1,
      maxWidth: 520,
      width: '100%' as const,
    },
    heroCollage: {
      alignSelf: 'center' as const,
      marginTop: 0,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamilyForStyle('elegant', '500'),
      fontSize: 38,
      fontWeight: '500' as const,
      lineHeight: 41,
      marginTop: spacing.xs,
      textAlign: 'left' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 21,
      marginTop: spacing.xs,
      textAlign: 'left' as const,
    },
    headlineBlock: {
      alignSelf: 'stretch' as const,
    },
    form: {
      alignSelf: 'stretch' as const,
    },
    labelRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: spacing.xs,
    },
    fieldLabel: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 15,
      fontWeight: '500' as const,
    },
    codeHint: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    inputShell: {
      alignItems: 'center' as const,
      backgroundColor: 'rgba(255, 253, 249, 0.5)',
      borderColor: colors.timelineDivider,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row' as const,
    },
    input: {
      color: colors.text,
      fontFamily: getFontFamily('400'),
      flex: 1,
      fontSize: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: 0,
    },
    passwordToggle: {
      alignItems: 'center' as const,
      height: 48,
      justifyContent: 'center' as const,
      marginRight: spacing.sm,
      width: 48,
    },
    primaryButton: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: colors.text,
      borderRadius: 999,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    primaryButtonDisabled: {
      backgroundColor: disabledPrimaryButtonColor,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    primaryButtonTextDisabled: {
      color: colors.surface,
      opacity: 0.82,
    },
    alternateSignIn: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
    },
    quietLinkAction: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
    },
    quietLinkText: {
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center' as const,
    },
    quietLinkTextEnabled: {
      color: colors.text,
      textDecorationLine: 'underline' as const,
    },
    quietLinkTextDisabled: {
      color: disabledCodeLinkColor,
    },
    socialControls: {
      alignSelf: 'stretch' as const,
    },
    footerGroup: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
    },
    secondaryAction: {
      alignItems: 'center' as const,
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
    },
    forgotPasswordAction: {
      alignItems: 'center' as const,
      minHeight: 32,
      justifyContent: 'center' as const,
      paddingLeft: spacing.md,
    },
    secondaryActionText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      textDecorationLine: 'underline' as const,
    },
    accountAction: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    accountActionText: {
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center' as const,
    },
    accountActionLink: {
      fontFamily: getFontFamily('600'),
      fontWeight: '600' as const,
      textDecorationLine: 'underline' as const,
    },
    legal: {
      paddingBottom: spacing.sm,
    },
    loadingState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 180,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center' as const,
    },
  };
}

type LoginScreenProps = {
  onSignedIn: () => void;
  onCancel?: () => void;
  variant?: 'welcome' | 'locked';
};

export function LoginScreen({ onCancel, onSignedIn }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const navigation = useNavigation();
  const [step, setStep] = useState<FormStep>('password');
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const codeRef = useRef('');
  const [codeEmail, setCodeEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { isBlockingAuthInProgress, runBlockingAuthAction } =
    useBlockingAuthAction();
  const signInInFlightRef = useRef(false);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createLoginScreenStyles);
  const availableHeight = Math.max(height - insets.top - insets.bottom, 0);
  const layoutMetrics = getLoginLayoutMetrics(height, availableHeight);
  const heroLayoutMetrics = getWelcomeLayoutMetrics(height, availableHeight);
  const titleMetrics = getAuthTitleMetrics(width, layoutMetrics.bucket);
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
    isAuthPasswordSubmitReady(passwordInput);
  const isCodeRequestReady = isAuthEmailSubmitReady(emailInput);
  const isCodeStepReady = isAuthOtpSubmitReady(codeInput);
  const isCodeLinkEnabled = !isSubmitting && isCodeRequestReady;
  const canResendCode =
    !isSubmitting && step === 'code' && resendCooldownSeconds === 0;
  useEffect(() => {
    if (step !== 'code' || resendCooldownSeconds <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setResendCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resendCooldownSeconds, step]);
  const handleCodeLinkPress = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    if (isCodeRequestReady) {
      void handleSendCode();
      return;
    }

    emailInputRef.current?.focus();
  }, [isCodeRequestReady, isSubmitting]);
  const withBlockingAuth = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      signInInFlightRef.current = true;
      setIsSubmitting(true);

      try {
        return await runBlockingAuthAction(action);
      } finally {
        signInInFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [runBlockingAuthAction],
  );

  async function handleSendCode() {
    setErrorMessage(null);
    const email = emailRef.current;

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);
    setIsSendingCode(true);
    const result = await requestSignInOtp(email).finally(() => {
      setIsSendingCode(false);
      setIsSubmitting(false);
    });

    if (result.status === 'skipped') {
      setErrorMessage(t('account.errors.unavailable'));
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      return;
    }

    setCodeEmail(normalizeAccountEmail(email));
    codeRef.current = '';
    setCodeInput('');
    setResendCooldownSeconds(SIGN_IN_CODE_RESEND_COOLDOWN_SECONDS);
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

    try {
      const result = await withBlockingAuth(async () => {
        logAuth('Login screen: password sign-in submitted', {
          email: normalizeAccountEmail(email),
        });
        return signInWithPassword(email, password);
      });
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
      // no-op: handled by withBlockingAuth
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

    try {
      const result = await withBlockingAuth(async () => {
        logAuth('Login screen: OTP verification submitted', {
          email: normalizeAccountEmail(email),
        });
        return verifySignInOtp(email, code);
      });
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
      // no-op: handled by withBlockingAuth
    }
  }

  async function handleSocialSignIn(provider: SocialSignInProvider) {
    if (signInInFlightRef.current) {
      return;
    }

    setErrorMessage(null);
    try {
      const source = provider === 'google' ? 'login_google' : 'login_apple';
      const result = await withBlockingAuth(() =>
        runSocialSignIn({ provider, source }),
      );

      handleLoginSocialSignInResult(result, {
        setErrorMessage,
        finishSignIn: navigation.finishSignInToTimeline,
        onSignedIn,
      });
    } finally {
      // no-op: handled by withBlockingAuth
    }
  }

  return (
    <View style={styles.screen}>
      {onCancel ? <AuthBackButtonOverlay onBack={onCancel} /> : null}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: getAuthHeroScrollPaddingTop(insets.top),
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
      >
        <View style={styles.shell}>
          <AuthHeroCollage
            maxHeight={heroLayoutMetrics.heroMaxHeight}
            variant="onboarding"
            style={[
              styles.heroCollage,
              { marginBottom: layoutMetrics.heroToContentGap },
            ]}
          />

          <View style={styles.headlineBlock}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.88}
              numberOfLines={1}
              style={[
                styles.title,
                {
                  fontSize: titleMetrics.fontSize,
                  lineHeight: titleMetrics.lineHeight,
                  marginTop: 0,
                },
              ]}
            >
              {t('signIn.hifiTitle')}
            </Text>
            <Text
              style={[styles.body, { marginTop: layoutMetrics.titleToCopyGap }]}
            >
              {t('signIn.hifiBody')}
            </Text>
          </View>

          {isBlockingAuthInProgress || isSendingCode ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>
                {isSendingCode
                  ? t('account.sendingCode')
                  : t('signIn.signingIn')}
              </Text>
            </View>
          ) : step === 'password' ? (
            <View
              style={[styles.form, { marginTop: layoutMetrics.copyToFormGap }]}
            >
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>
                  {t('signIn.emailAddressLabel')}
                </Text>
              </View>
              <View
                style={[
                  styles.inputShell,
                  { minHeight: layoutMetrics.inputHeight },
                ]}
              >
                <AuthFormTextInput
                  ref={emailInputRef}
                  kind="email"
                  blurOnSubmit={false}
                  placeholder={t('account.emailPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  style={[
                    styles.input,
                    { minHeight: layoutMetrics.inputHeight - 2 },
                  ]}
                  valueRef={emailRef}
                  onValueChange={handleEmailChange}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>

              <View
                style={[
                  styles.labelRow,
                  { marginTop: layoutMetrics.formFieldGap },
                ]}
              >
                <Text style={styles.fieldLabel}>
                  {t('account.passwordLabel')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.forgotPasswordAction}
                  onPress={() => navigation.push('ForgotPassword', undefined)}
                >
                  <Text style={styles.secondaryActionText}>
                    {t('signIn.forgotPassword')}
                  </Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.inputShell,
                  { minHeight: layoutMetrics.inputHeight },
                ]}
              >
                <AuthFormTextInput
                  ref={passwordInputRef}
                  kind="password"
                  placeholder={t('signIn.passwordInputPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  secureTextEntry={!isPasswordVisible}
                  style={[
                    styles.input,
                    { minHeight: layoutMetrics.inputHeight - 2 },
                  ]}
                  valueRef={passwordRef}
                  onValueChange={handlePasswordChange}
                  onSubmitEditing={() => void handlePasswordSignIn()}
                />
                <Pressable
                  accessibilityLabel={
                    isPasswordVisible
                      ? t('signIn.hidePassword')
                      : t('signIn.showPassword')
                  }
                  accessibilityRole="button"
                  style={styles.passwordToggle}
                  onPress={() => setIsPasswordVisible((visible) => !visible)}
                >
                  <Ionicons
                    color={colors.textMuted}
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                  />
                </Pressable>
              </View>

              {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
              <PrimaryButton
                disabled={isSubmitting || !isPasswordStepReady}
                label={
                  isSubmitting ? t('signIn.signingIn') : t('signIn.signIn')
                }
                minHeight={layoutMetrics.primaryButtonHeight}
                style={{ marginTop: layoutMetrics.primaryButtonTopGap }}
                onPress={() => void handlePasswordSignIn()}
              />
              <View style={styles.alternateSignIn}>
                <Pressable
                  accessibilityLabel={t('signIn.useCodeInstead')}
                  accessibilityRole="link"
                  accessibilityState={{ disabled: !isCodeLinkEnabled }}
                  disabled={isSubmitting}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                  style={[
                    styles.quietLinkAction,
                    { marginTop: layoutMetrics.codeLinkTopGap },
                  ]}
                  onPress={handleCodeLinkPress}
                >
                  <Text
                    style={[
                      styles.quietLinkText,
                      isCodeLinkEnabled
                        ? styles.quietLinkTextEnabled
                        : styles.quietLinkTextDisabled,
                    ]}
                  >
                    {t('signIn.useCodeInstead')}
                  </Text>
                </Pressable>
                <SocialSignInControls
                  iconOrder="apple-google"
                  style={[
                    styles.socialControls,
                    { marginTop: layoutMetrics.socialTopGap },
                  ]}
                  onGooglePress={() => void handleSocialSignIn('google')}
                  onApplePress={() => void handleSocialSignIn('apple')}
                />
              </View>
            </View>
          ) : (
            <View
              style={[styles.form, { marginTop: layoutMetrics.copyToFormGap }]}
            >
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>{t('account.codeLabel')}</Text>
              </View>
              <Text style={styles.codeHint}>
                {t('account.codeHint', { email: codeEmail })}
              </Text>
              <View
                style={[
                  styles.inputShell,
                  { minHeight: layoutMetrics.inputHeight },
                ]}
              >
                <AuthFormTextInput
                  kind="code"
                  placeholder={t('account.codePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    { minHeight: layoutMetrics.inputHeight - 2 },
                  ]}
                  valueRef={codeRef}
                  onValueChange={handleCodeChange}
                />
              </View>
              {errorMessage ? <FormErrorBanner message={errorMessage} /> : null}
              <PrimaryButton
                disabled={isSubmitting || !isCodeStepReady}
                label={
                  isSubmitting ? t('account.verifying') : t('signIn.verifyCode')
                }
                minHeight={layoutMetrics.primaryButtonHeight}
                style={{ marginTop: layoutMetrics.primaryButtonTopGap }}
                onPress={() => void handleVerifyCode()}
              />
              <Pressable
                accessibilityLabel={
                  resendCooldownSeconds > 0
                    ? t('account.resendCodeIn', {
                        seconds: resendCooldownSeconds,
                      })
                    : t('account.resendCode')
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: !canResendCode }}
                disabled={!canResendCode}
                style={[styles.quietLinkAction, { marginTop: spacing.xs }]}
                onPress={() => void handleSendCode()}
              >
                <Text
                  style={[
                    styles.quietLinkText,
                    canResendCode
                      ? styles.quietLinkTextEnabled
                      : styles.quietLinkTextDisabled,
                  ]}
                >
                  {resendCooldownSeconds > 0
                    ? t('account.resendCodeIn', {
                        seconds: resendCooldownSeconds,
                      })
                    : t('account.resendCode')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryAction}
                onPress={() => {
                  setStep('password');
                  codeRef.current = '';
                  setCodeInput('');
                  setResendCooldownSeconds(0);
                  setErrorMessage(null);
                }}
              >
                <Text style={styles.secondaryActionText}>
                  {t('signIn.usePasswordInstead')}
                </Text>
              </Pressable>
            </View>
          )}

          {isSubmitting && !isBlockingAuthInProgress && !isSendingCode ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ marginTop: spacing.md }}
            />
          ) : null}

          {!isBlockingAuthInProgress && !isSendingCode ? (
            <View style={styles.footerGroup}>
              {isRemoteAuthConfigured() ? (
                <Pressable
                  accessibilityLabel={t('signIn.newToTailoCreateAccount')}
                  accessibilityRole="link"
                  disabled={isSubmitting}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                  style={[
                    styles.accountAction,
                    { marginTop: layoutMetrics.accountTopGap },
                  ]}
                  onPress={() =>
                    navigation.push('AccountSettings', {
                      mode: 'create',
                      signInPresentation: 'pop',
                    })
                  }
                >
                  <Text style={styles.accountActionText}>
                    {t('signIn.newToTailoPrefix')}{' '}
                    <Text style={styles.accountActionLink}>
                      {t('signIn.createAccountLink')}
                    </Text>
                  </Text>
                </Pressable>
              ) : null}

              <AuthLegalCopy
                style={[styles.legal, { marginTop: layoutMetrics.legalTopGap }]}
              />
            </View>
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
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createLoginScreenStyles);

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
