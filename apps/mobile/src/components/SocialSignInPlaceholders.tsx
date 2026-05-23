import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';

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

/** Placeholder Google / Apple sign-in controls (providers not wired yet). */
export function SocialSignInPlaceholders({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.row, style]}>
      <Pressable
        accessibilityLabel={t('signIn.signInWithGoogle')}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.button}
      >
        <Ionicons color={colors.text} name="logo-google" size={24} />
      </Pressable>
      <Pressable
        accessibilityLabel={t('signIn.signInWithApple')}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.button}
      >
        <Ionicons color={colors.text} name="logo-apple" size={24} />
      </Pressable>
    </View>
  );
}
