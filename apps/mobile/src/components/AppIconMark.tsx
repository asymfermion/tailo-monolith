import { Image } from 'expo-image';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { t } from '@/i18n';

const appIconSource = require('../../assets/brand/app-icon.png');

/** `app-icon.png` includes store-style padding; zoom in so the emblem fills the mark. */
const ICON_CROP_ZOOM = 1.48;

const DEFAULT_SIZE = 40;

type AppIconMarkProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** App icon from `assets/brand/app-icon.png` (same asset as Expo `app.json` icon). */
export function AppIconMark({ size = DEFAULT_SIZE, style }: AppIconMarkProps) {
  const scaledSize = size * ICON_CROP_ZOOM;
  const cropOffset = (scaledSize - size) / 2;

  return (
    <View
      style={[{ width: size, height: size, overflow: 'hidden' }, style]}
      accessibilityRole="image"
      accessibilityLabel={t('common.appName')}
    >
      <Image
        source={appIconSource}
        style={{
          position: 'absolute',
          width: scaledSize,
          height: scaledSize,
          left: -cropOffset,
          top: -cropOffset,
        }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
