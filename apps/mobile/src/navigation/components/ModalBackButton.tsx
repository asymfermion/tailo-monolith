import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';
import { t } from '@/i18n';

import { useModalDismiss } from './ModalDismissContext';

/** Ionicons chevron-back draws inset inside its square; offset aligns visible stroke with content. */
const LEADING_CHEVRON_OPTICAL_OFFSET = -8;

/** `leading` is opt-in (e.g. EventDetail); default `center` keeps other modals unchanged. */
type ModalBackButtonProps = {
  align?: 'center' | 'leading';
  color?: string;
  onPress: () => void;
  size?: number;
};

export function ModalBackButton({
  align = 'center',
  color = colors.text,
  onPress,
  size = 28,
}: ModalBackButtonProps) {
  const dismiss = useModalDismiss(onPress);
  const isLeading = align === 'leading';

  return (
    <Pressable
      accessibilityLabel={t('common.back')}
      accessibilityRole="button"
      hitSlop={
        isLeading
          ? { top: 12, bottom: 12, left: 12, right: 24 }
          : { top: 12, bottom: 12, left: 4, right: 20 }
      }
      style={[styles.button, isLeading && styles.buttonLeading]}
      onPress={dismiss}
    >
      <Ionicons
        color={color}
        name="chevron-back"
        size={size}
        style={isLeading ? styles.iconLeading : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    minHeight: 48,
    minWidth: 48,
  },
  buttonLeading: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 28,
    overflow: 'visible',
    width: 28,
  },
  iconLeading: {
    marginLeft: LEADING_CHEVRON_OPTICAL_OFFSET,
  },
});
