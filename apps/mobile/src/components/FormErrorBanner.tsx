import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

function createFormErrorBannerStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    banner: {
      alignItems: 'flex-start' as const,
      backgroundColor: '#FFF3F0',
      borderColor: '#E8B7AE',
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
    },
    iconWrap: {
      alignItems: 'center' as const,
      backgroundColor: '#E04F3E',
      borderRadius: 14,
      height: 28,
      justifyContent: 'center' as const,
      width: 28,
    },
    text: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      paddingTop: 4,
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
      <View style={styles.iconWrap}>
        <Ionicons color="#FFFFFF" name="alert" size={16} />
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
