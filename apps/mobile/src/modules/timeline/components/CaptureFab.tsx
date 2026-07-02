import { Pressable, Text, View } from 'react-native';

import { t, useAppLocale } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';

type CaptureFabProps = {
  onPress: () => void;
};

function createCaptureFabStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    container: {
      position: 'absolute' as const,
      right: 20,
    },
    button: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.accent,
      shadowColor: colors.shadow,
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    icon: {
      color: colors.surface,
      fontFamily: getFontFamily('500'),
      fontSize: 30,
      fontWeight: '500' as const,
      lineHeight: 32,
    },
  };
}

export function CaptureFab({ onPress }: CaptureFabProps) {
  useAppLocale();
  const bottom = useTabBarContentInset();
  const styles = useThemedStyles(createCaptureFabStyles);

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom }]}>
      <Pressable
        accessibilityLabel={t('accessibility.captureMoment')}
        accessibilityRole="button"
        style={styles.button}
        onPress={onPress}
      >
        <Text style={styles.icon}>+</Text>
      </Pressable>
    </View>
  );
}
