import { Text } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

function createFormErrorBannerStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    text: {
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
  };
}

type FormErrorBannerProps = {
  message: string;
};

export function FormErrorBanner({ message }: FormErrorBannerProps) {
  const styles = useThemedStyles(createFormErrorBannerStyles);

  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.text}
    >
      {message}
    </Text>
  );
}
