import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AuthFormTextInput } from '@/components/AuthFormTextInput';
import { SocialSignInControls } from '@/components/SocialSignInControls';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useAppearance, useThemedStyles } from '@/lib/appearance';
import {
  isAuthEmailSubmitReady,
  isAuthOtpSubmitReady,
} from '@/lib/authFormReadiness';
import { useNavigation } from '@/navigation/NavigationContext';
import {
  isValidAccountEmail,
  normalizeAccountEmail,
} from '@/modules/auth/accountEmailLink';
import { completeEmailAccountConnection } from '@/modules/auth/completeEmailAccountConnection';
import type { CompleteEmailAccountConnectionResult } from '@/modules/auth/completeEmailAccountConnection';
import {
  requestEmailLink,
  requestEmailSignUp,
  verifyEmailLink,
  verifyEmailSignUp,
} from '@/modules/auth/authService';
import type { AuthSession, SocialSignInResult } from '@/modules/auth/authTypes';
import { useAuthAccountStatus } from '@/modules/auth/useAuthAccountStatus';
import {
  runSocialSignIn,
  type SocialSignInProvider,
} from '@/modules/auth/socialSignInFlow';
import { useBlockingAuthAction } from '@/modules/auth/useBlockingAuthAction';
import { clearLocalAnonymousAccountDataForAccountSwitch } from '@/modules/auth/clearLocalAnonymousAccountData';
import { createAccountSettingsStyles } from './accountSettingsStyles';

type FormStep = 'email' | 'code';

type AnonymousAccountUpgradeFormProps = {
  mode: 'link' | 'create';
  presentation?: 'standalone' | 'profile';
  signInPresentation?: 'pop';
  onLinkFlowStart?: () => void;
  onLinked: () => void;
};

export function resolveGoogleAuthModeForAccountUpgrade(input: {
  formMode: 'link' | 'create';
  session: AuthSession | null;
}): 'link' | 'sign_in' {
  if (input.formMode === 'link') {
    return 'link';
  }

  return input.session?.isAnonymous ? 'link' : 'sign_in';
}

export const resolveAppleAuthModeForAccountUpgrade =
  resolveGoogleAuthModeForAccountUpgrade;

export function isGoogleIdentityAlreadyLinkedError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('already linked') ||
    normalized.includes('already exists') ||
    normalized.includes('identity is already') ||
    (normalized.includes('identity') && normalized.includes('in use'))
  );
}

export const isAppleIdentityAlreadyLinkedError =
  isGoogleIdentityAlreadyLinkedError;

type SocialAccountUpgradeProvider = 'google' | 'apple';

type SocialAccountUpgradeSignIn = (options: {
  mode?: 'sign_in' | 'link';
  source?: string;
}) => Promise<SocialSignInResult>;

type RunSocialAccountUpgradeAuthInput = {
  provider: SocialAccountUpgradeProvider;
  formMode: 'link' | 'create';
  session: AuthSession | null;
  signIn: SocialAccountUpgradeSignIn;
  clearLocalAnonymousData: () => Promise<void>;
  completeAccountConnection: () => Promise<CompleteEmailAccountConnectionResult>;
  isIdentityAlreadyLinkedError: (message: string) => boolean;
};

export async function runSocialAccountUpgradeAuth({
  provider,
  formMode,
  session,
  signIn,
  clearLocalAnonymousData,
  completeAccountConnection,
  isIdentityAlreadyLinkedError,
}: RunSocialAccountUpgradeAuthInput): Promise<SocialSignInResult> {
  const authMode = resolveGoogleAuthModeForAccountUpgrade({
    formMode,
    session,
  });
  const primarySource =
    formMode === 'link'
      ? `account_link_${provider}`
      : `account_create_${provider}`;
  const primaryResult = await signIn({
    mode: authMode,
    source: primarySource,
  });

  if (
    primaryResult.status === 'error' &&
    authMode === 'link' &&
    isIdentityAlreadyLinkedError(primaryResult.message)
  ) {
    const fallbackSignIn = await signIn({
      mode: 'sign_in',
      source: `account_create_${provider}_existing`,
    });

    if (fallbackSignIn.status !== 'signed_in') {
      return fallbackSignIn;
    }

    await clearLocalAnonymousData();
    const bootstrapResult = await completeAccountConnection();

    if (bootstrapResult.status === 'partial') {
      return {
        status: 'error',
        message: bootstrapResult.message,
      };
    }

    return fallbackSignIn;
  }

  return primaryResult;
}

export function AnonymousAccountUpgradeForm({
  mode,
  presentation = 'standalone',
  signInPresentation,
  onLinkFlowStart,
  onLinked,
}: AnonymousAccountUpgradeFormProps) {
  const navigation = useNavigation();
  const account = useAuthAccountStatus();
  const [step, setStep] = useState<FormStep>('email');
  const emailRef = useRef('');
  const codeRef = useRef('');
  const [codeEmail, setCodeEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isBlockingAuthInProgress, runBlockingAuthAction } =
    useBlockingAuthAction();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createAccountSettingsStyles);
  const handleEmailChange = useCallback((value: string) => {
    setEmailInput(value);
  }, []);
  const handleCodeChange = useCallback((value: string) => {
    setCodeInput(value);
  }, []);
  const isEmailStepReady = isAuthEmailSubmitReady(emailInput);
  const isCodeStepReady = isAuthOtpSubmitReady(codeInput);

  async function handleSocialLink(provider: SocialSignInProvider) {
    setErrorMessage(null);
    setIsSubmitting(true);
    let result;

    try {
      result = await runBlockingAuthAction(async () => {
        return runSocialAccountUpgradeAuth({
          provider,
          formMode: mode,
          session: account.session,
          signIn: (options) => runSocialSignIn({ provider, ...options }),
          clearLocalAnonymousData:
            clearLocalAnonymousAccountDataForAccountSwitch,
          completeAccountConnection: completeEmailAccountConnection,
          isIdentityAlreadyLinkedError:
            provider === 'google'
              ? isGoogleIdentityAlreadyLinkedError
              : isAppleIdentityAlreadyLinkedError,
        });
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('account.errors.unavailable'),
      );
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (result.status === 'skipped') {
      setErrorMessage(t('account.unavailableBody'));
      return;
    }

    if (result.status === 'error') {
      return;
    }

    await account.refresh();
    onLinked();
  }

  async function handleSendCode() {
    setErrorMessage(null);
    const email = emailRef.current;

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);
    onLinkFlowStart?.();
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

    if (!isAuthOtpSubmitReady(code)) {
      setErrorMessage(t('account.errors.codeRequired'));
      return;
    }

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

  const showStandaloneHeader = presentation === 'standalone';
  const isProfileLink = presentation === 'profile' && mode === 'link';

  if (isBlockingAuthInProgress) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>{t('signIn.signingIn')}</Text>
      </View>
    );
  }

  return (
    <>
      {showStandaloneHeader ? (
        <>
          <Text style={styles.title}>
            {mode === 'create' ? t('account.createTitle') : t('account.title')}
          </Text>
          <Text style={styles.body}>
            {mode === 'create' ? t('account.createBody') : t('account.body')}
          </Text>
        </>
      ) : null}

      {step === 'email' ? (
        <>
          <Text
            style={[
              styles.fieldLabel,
              isProfileLink ? styles.profileFieldLabel : null,
            ]}
          >
            {t('account.emailLabel')}
          </Text>
          <AuthFormTextInput
            kind="email"
            placeholder={t('account.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            valueRef={emailRef}
            onValueChange={handleEmailChange}
          />
          <PrimaryButton
            disabled={isSubmitting || !isEmailStepReady}
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
            onValueChange={handleCodeChange}
          />
          <PrimaryButton
            disabled={isSubmitting || !isCodeStepReady}
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
              setCodeInput('');
              setErrorMessage(null);
            }}
          >
            <Text style={styles.secondaryActionText}>
              {t('account.useDifferentEmail')}
            </Text>
          </Pressable>
        </>
      )}

      {step === 'email' ? (
        <>
          <SocialSignInControls
            style={{ marginTop: spacing.lg }}
            onGooglePress={() => void handleSocialLink('google')}
            onApplePress={() => void handleSocialLink('apple')}
          />
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
        </>
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
