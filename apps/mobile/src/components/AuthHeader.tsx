import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthWordmark } from '@/components/AuthBranding';
import { spacing } from '@/constants/theme';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import {
  getAuthHeaderMetrics,
  getAuthWordmarkMetrics,
  type AuthHeaderVariant,
} from '@/lib/authWelcomeLayout';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';

function createAuthHeaderStyles(_: AppearanceContextValue) {
  return {
    backOverlay: {
      left: 0,
      position: 'absolute' as const,
      right: 0,
      zIndex: 10,
    },
    backButtonSlot: {
      left: spacing.lg,
      position: 'absolute' as const,
      zIndex: 2,
    },
    wordmarkBand: {
      alignSelf: 'stretch' as const,
      position: 'relative' as const,
      width: '100%' as const,
    },
    wordmarkRow: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      justifyContent: 'center' as const,
    },
  };
}

function useAuthBackButtonTopInset(): number {
  const insets = useSafeAreaInsets();

  return getAuthHeaderMetrics(insets.top, 'utility').paddingTop;
}

/** Screen-level back chevron shared across auth screens. */
export function AuthBackButtonOverlay({
  onBack,
  style,
}: {
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createAuthHeaderStyles);
  const backButtonTop = useAuthBackButtonTopInset();

  return (
    <View pointerEvents="box-none" style={[styles.backOverlay, style]}>
      <View style={[styles.backButtonSlot, { top: backButtonTop }]}>
        <ModalBackButton align="leading" onPress={onBack} />
      </View>
    </View>
  );
}

/** Inline centered wordmark band for utility auth pages. */
export function AuthWordmarkBand({
  variant = 'utility',
  style,
}: {
  variant?: AuthHeaderVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createAuthHeaderStyles);
  const headerMetrics = getAuthHeaderMetrics(insets.top, variant);
  const wordmarkMetrics = getAuthWordmarkMetrics(variant);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wordmarkBand,
        {
          minHeight: headerMetrics.totalHeight,
          paddingBottom: headerMetrics.bottomSpacing,
          paddingTop: headerMetrics.paddingTop,
        },
        style,
      ]}
    >
      <View style={styles.wordmarkRow}>
        <AuthWordmark
          style={{
            height: wordmarkMetrics.height,
            width: wordmarkMetrics.width,
          }}
        />
      </View>
    </View>
  );
}

export type AuthHeaderProps = {
  variant?: AuthHeaderVariant;
  showBackButton?: boolean;
  onBack?: () => void;
  showWordmark?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Auth header composition. Back chevron always uses the shared screen overlay
 * so positioning matches across sign-in, reset-password, and utility screens.
 */
export function AuthHeader({
  variant = 'utility',
  showBackButton = false,
  onBack,
  showWordmark = true,
  style,
}: AuthHeaderProps) {
  return (
    <>
      {showBackButton && onBack ? (
        <AuthBackButtonOverlay onBack={onBack} />
      ) : null}
      {showWordmark ? (
        <AuthWordmarkBand style={style} variant={variant} />
      ) : null}
    </>
  );
}
