import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { useAppleSignInAvailability } from '@/modules/auth/appleNativeAuth';

function createStyles({ colors, getFontFamily }: AppearanceContextValue) {
  return {
    row: {
      flexDirection: 'row' as const,
      gap: spacing.md,
      justifyContent: 'center' as const,
      marginTop: spacing.lg,
    },
    labeledStack: {
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    button: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 26,
      borderWidth: 1,
      height: 52,
      justifyContent: 'center' as const,
      opacity: 0.72,
      width: 52,
    },
    labeledButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
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
  onGooglePress,
  onApplePress,
}: {
  style?: StyleProp<ViewStyle>;
  variant?: 'icons' | 'labeled';
  onGooglePress?: () => void;
  onApplePress?: () => void;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createStyles);
  const isAppleAvailable = useAppleSignInAvailability();
  const canUseApple = Boolean(onApplePress && isAppleAvailable);

  if (variant === 'labeled') {
    return (
      <View style={[styles.labeledStack, style]}>
        <Pressable
          accessibilityLabel={t('signIn.signInWithGoogle')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !onGooglePress }}
          disabled={!onGooglePress}
          style={styles.labeledButton}
          onPress={onGooglePress}
        >
          <Ionicons color={colors.text} name="logo-google" size={20} />
          <Text style={styles.labeledButtonText}>
            {t('onboarding.continueWithGoogle')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('signIn.signInWithApple')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canUseApple }}
          disabled={!canUseApple}
          style={styles.labeledButton}
          onPress={onApplePress}
        >
          <Ionicons color={colors.text} name="logo-apple" size={20} />
          <Text style={styles.labeledButtonText}>
            {t('onboarding.continueWithApple')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Pressable
        accessibilityLabel={t('signIn.signInWithGoogle')}
        accessibilityRole="button"
        accessibilityState={{ disabled: !onGooglePress }}
        disabled={!onGooglePress}
        style={styles.button}
        onPress={onGooglePress}
      >
        <Ionicons color={colors.text} name="logo-google" size={24} />
      </Pressable>
      <Pressable
        accessibilityLabel={t('signIn.signInWithApple')}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canUseApple }}
        disabled={!canUseApple}
        style={styles.button}
        onPress={onApplePress}
      >
        <Ionicons color={colors.text} name="logo-apple" size={24} />
      </Pressable>
    </View>
  );
}
