import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  View,
  useWindowDimensions,
  type ImageStyle,
  type ImageSourcePropType,
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
import {
  getAuthLayoutBucket,
  getAuthWordmarkMetrics,
  type AuthLayoutBucket,
} from '@/lib/authWelcomeLayout';

const wordmarkSource = require('../assets/auth/tailo-wordmark-dark-transparent.png');
export const authHeroMainSource = require('../assets/auth/auth-photo-onboarding-main-beach.png');
const defaultMiniSource = require('../assets/auth/auth-photo-mini-beach.jpg');
const tornPaperSource = require('../assets/auth/torn-paper-edge-ivory.png');

function createStyles({ colors, getFontFamily }: AppearanceContextValue) {
  return {
    wordmark: {
      alignSelf: 'center' as const,
      height: 39,
      width: 92,
    },
    collage: {
      alignSelf: 'center' as const,
      backgroundColor: colors.background,
      overflow: 'visible' as const,
      position: 'relative' as const,
    },
    photoStage: {
      position: 'relative' as const,
    },
    printedPhoto: {
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 253, 249, 0.98)',
      borderRadius: 4,
      borderWidth: 5,
      boxShadow: '0 10px 22px rgba(21, 20, 18, 0.1)',
      overflow: 'hidden' as const,
      position: 'absolute' as const,
      zIndex: 2,
    },
    printedPhotoImage: {
      borderRadius: 2,
      height: '100%' as const,
      width: '100%' as const,
    },
    tornPaper: {
      position: 'absolute' as const,
      zIndex: 4,
    },
    polaroid: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 4,
      borderWidth: 1,
      boxShadow: '0 9px 17px rgba(21, 20, 18, 0.13)',
      padding: 6,
      paddingBottom: 16,
      position: 'absolute' as const,
      zIndex: 5,
    },
    polaroidImage: {
      backgroundColor: colors.border,
      height: '100%' as const,
      width: '100%' as const,
    },
    legalRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      justifyContent: 'center' as const,
    },
    legalText: {
      alignSelf: 'center' as const,
      color: colors.text,
      flexShrink: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 12,
      lineHeight: 18,
      maxWidth: 284,
      textAlign: 'center' as const,
      width: '100%' as const,
    },
    legalLink: {
      textDecorationLine: 'underline' as const,
    },
    memoryStripStage: {
      alignSelf: 'flex-start' as const,
      overflow: 'visible' as const,
      position: 'relative' as const,
    },
    memoryStripPhoto: {
      backgroundColor: colors.surface,
      borderColor: 'rgba(255, 253, 249, 0.98)',
      borderRadius: 3,
      borderWidth: 4,
      boxShadow: '0 8px 18px rgba(21, 20, 18, 0.09)',
      overflow: 'hidden' as const,
      position: 'relative' as const,
      zIndex: 2,
    },
    memoryStripImage: {
      borderRadius: 1,
      height: '100%' as const,
      width: '100%' as const,
    },
    memoryStripTorn: {
      bottom: 0,
      left: 0,
      position: 'absolute' as const,
      zIndex: 3,
    },
  };
}

type AuthWordmarkProps = {
  source?: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
};

type AuthMemoryStripProps = {
  bucket?: AuthLayoutBucket;
  source?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
};

/** Compact printed-photo accent for utility auth screens (forgot-password, etc.). */
export function AuthMemoryStrip({
  bucket,
  source = authHeroMainSource,
  style,
}: AuthMemoryStripProps) {
  const { height, width } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);
  const resolvedBucket = bucket ?? getAuthLayoutBucket(height);
  const stripWidth =
    resolvedBucket === 'short'
      ? Math.min(Math.max(width * 0.42, 160), 190)
      : resolvedBucket === 'tall'
        ? Math.min(Math.max(width * 0.48, 190), 220)
        : Math.min(Math.max(width * 0.45, 175), 205);
  const stripHeight =
    resolvedBucket === 'short'
      ? Math.min(Math.max(stripWidth * 0.52, 80), 95)
      : resolvedBucket === 'tall'
        ? Math.min(Math.max(stripWidth * 0.5, 95), 110)
        : Math.min(Math.max(stripWidth * 0.51, 88), 102);
  const tornHeight = stripHeight * 0.22;
  const stageHeight = stripHeight + tornHeight * 0.35;

  return (
    <View
      style={[
        styles.memoryStripStage,
        { height: stageHeight, width: stripWidth },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={t('signIn.heroAccessibilityLabel')}
    >
      <View
        style={[
          styles.memoryStripPhoto,
          {
            height: stripHeight,
            transform: [{ rotate: '-1.5deg' }],
            width: stripWidth,
          },
        ]}
      >
        <Image
          source={source}
          contentFit="cover"
          style={styles.memoryStripImage}
          accessibilityIgnoresInvertColors
        />
      </View>
      <Image
        source={tornPaperSource}
        contentFit="fill"
        style={[
          styles.memoryStripTorn,
          {
            height: tornHeight,
            transform: [{ rotate: '-1.5deg' }],
            width: stripWidth * 0.98,
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

export function AuthWordmark({
  source = wordmarkSource,
  style,
}: AuthWordmarkProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Image
      source={source}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel={t('common.appName')}
      style={[styles.wordmark, style]}
      accessibilityIgnoresInvertColors
    />
  );
}

type AuthHeroCollageProps = {
  compact?: boolean;
  maxHeight?: number;
  variant?: 'login' | 'onboarding';
  wordmarkSource?: ImageSourcePropType;
  heroSource?: ImageSourcePropType;
  miniSource?: ImageSourcePropType;
  tornPaperSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
};

export function AuthHeroCollage({
  compact = false,
  maxHeight,
  variant = 'login',
  wordmarkSource: providedWordmarkSource = wordmarkSource,
  heroSource,
  miniSource = defaultMiniSource,
  tornPaperSource: providedTornPaperSource = tornPaperSource,
  style,
}: AuthHeroCollageProps) {
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);
  const availableWidth = compact
    ? Math.min(Math.max(width - spacing.lg * 2, 280), 520)
    : Math.min(Math.max(width - spacing.md, 320), 560);
  const isLoginVariant = variant === 'login';
  const wordmarkMetrics = getAuthWordmarkMetrics('hero');
  const wordmarkHeight = compact ? 34 : wordmarkMetrics.height;
  const wordmarkWidth = compact
    ? wordmarkHeight * (1024 / 437)
    : wordmarkMetrics.width;
  const stageTop =
    wordmarkHeight +
    (compact ? 6 : isLoginVariant ? 7 : wordmarkMetrics.stageGap);
  const layerBottomPadding = compact ? 6 : isLoginVariant ? 8 : 10;
  const maxHeightStageTarget = maxHeight
    ? Math.max(
        maxHeight - stageTop - layerBottomPadding - 2,
        compact ? 140 : 176,
      )
    : null;
  const widthBasedStageHeight = compact
    ? Math.min(Math.max(availableWidth * 0.48, 152), 184)
    : maxHeightStageTarget
      ? Math.min(Math.max(maxHeightStageTarget, 210), 284)
      : Math.min(Math.max(availableWidth * 0.58, 210), 252);
  const stageHeight = maxHeightStageTarget
    ? Math.min(widthBasedStageHeight, maxHeightStageTarget)
    : widthBasedStageHeight;
  const printedWidth = availableWidth * (compact ? 0.8 : 0.94);
  const printedHeight = compact
    ? stageHeight * 0.72
    : isLoginVariant
      ? Math.min(stageHeight * 0.98, printedWidth * 0.82)
      : Math.min(stageHeight * 0.98, printedWidth * 0.78);
  const polaroidSize = stageHeight * (compact ? 0.39 : 0.32);
  const printedTop = stageTop + (compact ? 6 : 8);
  const printedLeft = availableWidth * (compact ? 0.08 : 0.015);
  const tornHeight = stageHeight * (compact ? 0.18 : 0.2);
  const tornTop =
    printedTop + printedHeight - tornHeight * (compact ? 0.72 : 0.82);
  const polaroidHeight = polaroidSize * 1.16;
  const rawPolaroidTop =
    printedTop + printedHeight - polaroidSize * (compact ? 0.56 : 1.12);
  const maxPolaroidTop =
    stageTop + stageHeight - polaroidHeight - layerBottomPadding;
  const polaroidTop = Math.min(rawPolaroidTop, maxPolaroidTop);
  const visibleLayerBottom = Math.max(
    wordmarkHeight,
    printedTop + printedHeight,
    tornTop + tornHeight,
    polaroidTop + polaroidHeight,
  );
  const totalHeight = Math.ceil(visibleLayerBottom + layerBottomPadding);
  const resolvedHeroSource = heroSource ?? authHeroMainSource;

  return (
    <View
      style={[
        styles.collage,
        { height: totalHeight, width: availableWidth },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={t('signIn.heroAccessibilityLabel')}
    >
      <AuthWordmark
        source={providedWordmarkSource}
        style={{
          height: wordmarkHeight,
          width: wordmarkWidth,
        }}
      />
      <View
        style={[
          styles.printedPhoto,
          {
            height: printedHeight,
            left: printedLeft,
            top: printedTop,
            transform: [{ rotate: compact ? '-1.5deg' : '-2deg' }],
            width: printedWidth,
          },
        ]}
      >
        <Image
          source={resolvedHeroSource}
          contentFit="cover"
          style={styles.printedPhotoImage}
          accessibilityIgnoresInvertColors
        />
      </View>
      <Image
        source={providedTornPaperSource}
        contentFit="fill"
        style={[
          styles.tornPaper,
          {
            height: tornHeight,
            left: compact ? availableWidth * 0.06 : printedLeft,
            top: tornTop,
            transform: [{ rotate: compact ? '-1.5deg' : '-2deg' }],
            width: printedWidth * (compact ? 0.98 : 1),
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        accessibilityIgnoresInvertColors
      />
      <View
        style={[
          styles.polaroid,
          {
            top: polaroidTop,
            height: polaroidHeight,
            right: availableWidth * (compact ? 0.12 : -0.005),
            transform: [{ rotate: compact ? '7deg' : '6.5deg' }],
            width: polaroidSize,
          },
        ]}
      >
        <Image
          source={miniSource}
          contentFit="cover"
          style={styles.polaroidImage}
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}

type AuthLegalCopyProps = {
  showLockIcon?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AuthLegalCopy({
  showLockIcon = false,
  style,
}: AuthLegalCopyProps) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.legalRow, style]}>
      {showLockIcon ? (
        <Ionicons color={colors.text} name="lock-closed-outline" size={18} />
      ) : null}
      <Text style={styles.legalText}>
        {t('signIn.legalPrefix')}{' '}
        <Text style={styles.legalLink}>{t('signIn.termsOfService')}</Text>
        {t('signIn.legalJoiner')}
        <Text style={styles.legalLink}>{t('signIn.privacyPolicy')}</Text>.
      </Text>
    </View>
  );
}
