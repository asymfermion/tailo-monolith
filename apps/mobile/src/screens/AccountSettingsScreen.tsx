import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';
import {
  isValidAccountEmail,
  normalizeAccountEmail,
  requestEmailLink,
  useAuthAccountStatus,
  verifyEmailLink,
} from '@/modules/auth';
import { useNavigation } from '@/navigation/NavigationContext';

type FormStep = 'email' | 'code' | 'done';

function createAccountSettingsScreenStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    centered: {
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
    },
    content: {
      flex: 1,
      paddingTop: spacing.lg,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 24,
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
      marginTop: spacing.lg,
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
    errorText: {
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.md,
    },
  };
}

export function AccountSettingsScreen() {
  const navigation = useNavigation();
  const account = useAuthAccountStatus();
  const [step, setStep] = useState<FormStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createAccountSettingsScreenStyles);

  const isLinked =
    !account.isAnonymous && account.emailConfirmed && Boolean(account.email);

  async function handleSendCode() {
    setErrorMessage(null);

    if (!isValidAccountEmail(email)) {
      setErrorMessage(t('account.errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);

    const result = await requestEmailLink(email);

    setIsSubmitting(false);

    if (result.status === 'skipped') {
      setErrorMessage(t('account.errors.unavailable'));
      return;
    }

    if (result.status === 'already_linked') {
      await account.refresh();
      setStep('done');
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      return;
    }

    setStep('code');
  }

  async function handleVerifyCode() {
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await verifyEmailLink(email, code);

    setIsSubmitting(false);

    if (result.status === 'skipped') {
      setErrorMessage(t('account.errors.unavailable'));
      return;
    }

    if (result.status === 'error') {
      setErrorMessage(result.message);
      return;
    }

    await account.refresh();
    setStep('done');
  }

  if (account.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!account.isConfigured) {
    return (
      <AccountLayout onBack={navigation.pop}>
        <Text style={styles.body}>{t('account.unavailableBody')}</Text>
      </AccountLayout>
    );
  }

  if (isLinked || step === 'done') {
    return (
      <AccountLayout onBack={navigation.pop}>
        <Text style={styles.title}>{t('account.linkedTitle')}</Text>
        <Text style={styles.body}>
          {t('account.linkedBody', {
            email: account.email ?? normalizeAccountEmail(email),
          })}
        </Text>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout onBack={navigation.pop}>
      <Text style={styles.title}>{t('account.title')}</Text>
      <Text style={styles.body}>{t('account.body')}</Text>

      {step === 'email' ? (
        <>
          <Text style={styles.fieldLabel}>{t('account.emailLabel')}</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t('account.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting ? t('account.sendingCode') : t('account.sendCode')
            }
            onPress={() => void handleSendCode()}
          />
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>{t('account.codeLabel')}</Text>
          <Text style={styles.codeHint}>
            {t('account.codeHint', { email: normalizeAccountEmail(email) })}
          </Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="one-time-code"
            autoCorrect={false}
            keyboardType="number-pad"
            maxLength={6}
            placeholder={t('account.codePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={code}
            onChangeText={setCode}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={
              isSubmitting ? t('account.verifying') : t('account.verifyCode')
            }
            onPress={() => void handleVerifyCode()}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.secondaryAction}
            onPress={() => {
              setStep('email');
              setCode('');
              setErrorMessage(null);
            }}
          >
            <Text style={styles.secondaryActionText}>
              {t('account.useDifferentEmail')}
            </Text>
          </Pressable>
        </>
      )}

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </AccountLayout>
  );
}

function AccountLayout({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createAccountSettingsScreenStyles);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: getModalHeaderTopInset(insets.top) },
      ]}
    >
      <ModalBackButton onPress={onBack} />
      <View style={styles.content}>{children}</View>
    </View>
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
  const styles = useThemedStyles(createAccountSettingsScreenStyles);

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
