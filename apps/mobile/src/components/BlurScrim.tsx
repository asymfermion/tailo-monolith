import { BlurView, type BlurViewProps } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import type { AppTheme } from '@/constants/theme';
import { useAppearance } from '@/lib/appearance';

const BLUR_INTENSITY = Platform.OS === 'ios' ? 80 : 96;

type BlurScrimProps = {
  onDismiss: () => void;
};

function getBlurTint(theme: AppTheme): BlurViewProps['tint'] {
  if (Platform.OS === 'ios') {
    return theme === 'dark'
      ? 'systemThickMaterialDark'
      : 'systemThickMaterialLight';
  }

  return theme === 'dark' ? 'dark' : 'light';
}

function getScrimColor(theme: AppTheme): string {
  return theme === 'dark' ? 'rgba(0, 0, 0, 0.38)' : 'rgba(28, 28, 26, 0.24)';
}

/** Full-screen blur + dim scrim; tap anywhere to dismiss. */
export function BlurScrim({ onDismiss }: BlurScrimProps) {
  const { theme } = useAppearance();

  return (
    <>
      <BlurView
        blurReductionFactor={Platform.OS === 'android' ? 3 : undefined}
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : undefined
        }
        intensity={BLUR_INTENSITY}
        style={StyleSheet.absoluteFill}
        tint={getBlurTint(theme)}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: getScrimColor(theme) },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
      />
    </>
  );
}
