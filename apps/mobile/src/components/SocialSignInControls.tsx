import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AuthButtonIcon } from '@/components/AuthButtonIcon';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { useAppleSignInAvailability } from '@/modules/auth/appleNativeAuth';

function createStyles({ colors, getFontFamily }: AppearanceContextValue) {
  return {
    row: {
      flexDirection: 'row' as const,
      gap: spacing.md,
      justifyContent: 'center' as const,
    },
    labeledStack: {
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    button: {
      alignItems: 'center' as const,
      backgroundColor: 'rgba(255, 253, 249, 0.5)',
      borderColor: colors.timelineDivider,
      borderRadius: 26,
      borderWidth: 1,
      boxShadow: '0 4px 10px rgba(21, 20, 18, 0.06)',
      height: 52,
      justifyContent: 'center' as const,
      width: 52,
    },
    labeledButton: {
      alignItems: 'center' as const,
      backgroundColor: 'rgba(255, 253, 249, 0.5)',
      borderColor: colors.timelineDivider,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      justifyContent: 'center' as const,
      minHeight: 52,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    labeledButtonText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
  };
}

/** Icon-only social sign-in controls (Google + Apple). */
export function SocialSignInControls({
  style,
  variant = 'icons',
  iconOrder = 'apple-google',
  onGooglePress,
  onApplePress,
}: {
  style?: StyleProp<ViewStyle>;
  variant?: 'icons' | 'labeled';
  iconOrder?: 'apple-google' | 'google-apple';
  onGooglePress?: () => void;
  onApplePress?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const isAppleAvailable = useAppleSignInAvailability();
  const canUseApple = Boolean(onApplePress && isAppleAvailable);

  if (variant === 'labeled') {
    return (
      <View style={[styles.labeledStack, style]}>
        <Pressable
          accessibilityLabel={t('onboarding.continueWithGoogle')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !onGooglePress }}
          disabled={!onGooglePress}
          style={styles.labeledButton}
          onPress={onGooglePress}
        >
          <AuthButtonIcon kind="google" size={22} />
          <Text style={styles.labeledButtonText}>
            {t('onboarding.continueWithGoogle')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('onboarding.continueWithApple')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canUseApple }}
          disabled={!canUseApple}
          style={styles.labeledButton}
          onPress={onApplePress}
        >
          <AuthButtonIcon kind="apple" size={23} />
          <Text style={styles.labeledButtonText}>
            {t('onboarding.continueWithApple')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const appleButton = (
    <Pressable
      key="apple"
      accessibilityLabel={t('onboarding.continueWithApple')}
      accessibilityRole="button"
      accessibilityState={{ disabled: !canUseApple }}
      disabled={!canUseApple}
      style={styles.button}
      onPress={onApplePress}
    >
      <AuthButtonIcon kind="apple" size={22} slotSize={26} />
    </Pressable>
  );
  const googleButton = (
    <Pressable
      key="google"
      accessibilityLabel={t('onboarding.continueWithGoogle')}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onGooglePress }}
      disabled={!onGooglePress}
      style={styles.button}
      onPress={onGooglePress}
    >
      <AuthButtonIcon kind="google" size={19} slotSize={26} />
    </Pressable>
  );
  const buttons =
    iconOrder === 'apple-google'
      ? [appleButton, googleButton]
      : [googleButton, appleButton];

  return <View style={[styles.row, style]}>{buttons}</View>;
}
