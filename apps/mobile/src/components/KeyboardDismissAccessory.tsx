import { useEffect, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';

function createAccessoryStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    toolbar: {
      alignItems: 'flex-end' as const,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    dismissButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    dismissLabel: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    androidBar: {
      alignItems: 'flex-end' as const,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      left: 0,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      position: 'absolute' as const,
      right: 0,
      zIndex: 10,
    },
  };
}

export function KeyboardDismissToolbar({
  onDismiss = () => Keyboard.dismiss(),
}: {
  onDismiss?: () => void;
}) {
  const styles = useThemedStyles(createAccessoryStyles);

  return (
    <View style={styles.toolbar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.dismissKeyboard')}
        hitSlop={8}
        style={styles.dismissButton}
        onPress={onDismiss}
      >
        <Text style={styles.dismissLabel}>{t('common.dismissKeyboard')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * iOS toolbar for a single text field. Each input needs its own nativeID under the
 * new architecture when multiple fields are on screen.
 */
export function KeyboardDismissInputAccessoryView({
  nativeID,
}: {
  nativeID: string;
}) {
  const { colors } = useAppearance();

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView backgroundColor={colors.surface} nativeID={nativeID}>
      <KeyboardDismissToolbar />
    </InputAccessoryView>
  );
}

/** Android fallback: bar pinned above the keyboard while it is visible. */
export function KeyboardDismissAndroidBar() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const styles = useThemedStyles(createAccessoryStyles);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        const nextHeight = event.endCoordinates.height;
        setKeyboardHeight((current) => {
          if (current > 0 && Math.abs(current - nextHeight) < 24) {
            return current;
          }

          return nextHeight;
        });
      },
    );
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (Platform.OS !== 'android' || keyboardHeight === 0) {
    return null;
  }

  return (
    <View style={[styles.androidBar, { bottom: keyboardHeight }]}>
      <KeyboardDismissToolbar />
    </View>
  );
}
