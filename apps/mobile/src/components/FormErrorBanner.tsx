import { Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

function createFormErrorBannerStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    banner: {
      backgroundColor: colors.surface,
      borderColor: colors.destructive,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    text: {
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
  };
}

type FormErrorBannerProps = {
  message: string;
};

export function FormErrorBanner({ message }: FormErrorBannerProps) {
  const styles = useThemedStyles(createFormErrorBannerStyles);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.banner}
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
