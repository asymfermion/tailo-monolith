import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { useAppleSignInAvailability } from '@/modules/auth/appleNativeAuth';

function createStyles({ colors }: AppearanceContextValue) {
  return {
    row: {
      flexDirection: 'row' as const,
      gap: spacing.md,
      justifyContent: 'center' as const,
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
  };
}

/** Icon-only social sign-in controls (Google + Apple). */
export function SocialSignInControls({
  style,
  onGooglePress,
  onApplePress,
}: {
  style?: StyleProp<ViewStyle>;
  onGooglePress?: () => void;
  onApplePress?: () => void;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createStyles);
  const isAppleAvailable = useAppleSignInAvailability();
  const canUseApple = Boolean(onApplePress && isAppleAvailable);

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
