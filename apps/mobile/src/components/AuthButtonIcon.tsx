import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppearance } from '@/lib/appearance';

const appleLogoSource = require('../assets/auth/apple-logo-black.png');
const googleGLogoSource = require('../assets/auth/google-g-logo.png');

export type AuthButtonIconKind = 'apple' | 'email' | 'google' | 'photos';

type AuthButtonIconProps = {
  color?: string;
  kind: AuthButtonIconKind;
  size?: number;
  slotSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function AuthButtonIcon({
  color,
  kind,
  size = 24,
  slotSize = 28,
  style,
}: AuthButtonIconProps) {
  const { colors } = useAppearance();
  const iconColor = color ?? colors.text;

  return (
    <View
      pointerEvents="none"
      style={[
        {
          alignItems: 'center',
          height: slotSize,
          justifyContent: 'center',
          width: slotSize,
        },
        style,
      ]}
    >
      {kind === 'google' ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit="contain"
          source={googleGLogoSource}
          style={{ height: size, width: size }}
        />
      ) : kind === 'apple' ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit="contain"
          source={appleLogoSource}
          style={{ height: size, width: size }}
        />
      ) : (
        <Ionicons
          color={iconColor}
          name={kind === 'photos' ? 'images-outline' : 'mail-outline'}
          size={size}
        />
      )}
    </View>
  );
}
