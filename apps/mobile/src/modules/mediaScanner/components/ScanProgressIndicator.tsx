import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';

import {
  computeOnboardingScanProgress,
  getScanPipelineSteps,
  getScanProgressDetail,
  getScanProgressHeadline,
  isOnboardingScanPipelineActive,
} from '../scanProgress';
import type { PhotoAccessState } from '../usePhotoAccess';

type ScanProgressIndicatorProps = {
  photoAccess: PhotoAccessState;
};

function createScanProgressIndicatorStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    container: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: spacing.md,
      paddingTop: spacing.md,
    },
    headerRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
    },
    completeDot: {
      backgroundColor: colors.accent,
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    headline: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    track: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 8,
      overflow: 'hidden' as const,
    },
    fill: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      height: '100%' as const,
    },
    stepsRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    step: {
      alignItems: 'center' as const,
      flex: 1,
      gap: spacing.xs,
    },
    stepDot: {
      backgroundColor: colors.border,
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    stepDotActive: {
      backgroundColor: colors.accent,
    },
    stepDotComplete: {
      backgroundColor: colors.accent,
    },
    stepLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 11,
      textAlign: 'center' as const,
    },
    stepLabelActive: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontWeight: '600' as const,
    },
    detail: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
  };
}

export function ScanProgressIndicator({
  photoAccess,
}: ScanProgressIndicatorProps) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createScanProgressIndicatorStyles);
  const progress = computeOnboardingScanProgress(photoAccess);
  const isActive = isOnboardingScanPipelineActive(photoAccess);
  const steps = getScanPipelineSteps(photoAccess);
  const animatedWidth = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [animatedWidth, progress]);

  const fillWidth = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {isActive ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <View style={styles.completeDot} />
        )}
        <Text style={styles.headline}>
          {getScanProgressHeadline(photoAccess)}
        </Text>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(progress * 100),
        }}
        style={styles.track}
      >
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
      </View>

      <View style={styles.stepsRow}>
        {steps.map((step) => (
          <View key={step.id} style={styles.step}>
            <View
              style={[
                styles.stepDot,
                step.status === 'complete' ? styles.stepDotComplete : null,
                step.status === 'active' ? styles.stepDotActive : null,
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                step.status === 'active' ? styles.stepLabelActive : null,
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.detail}>{getScanProgressDetail(photoAccess)}</Text>
    </View>
  );
}
