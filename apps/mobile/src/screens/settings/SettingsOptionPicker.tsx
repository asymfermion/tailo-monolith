import { useState, type TextStyle } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import {
  DismissibleDropdownMenu,
  useDropdownAnchor,
  type DropdownAnchor,
} from '@/components/DismissibleDropdownMenu';
import { spacing } from '@/constants/theme';
import { useAppearance, useThemedStyles } from '@/lib/appearance';

export type SettingsPickerOption<T extends string> = {
  value: T;
  label: string;
  labelStyle?: TextStyle;
};

export type SettingsOptionPickerProps<T extends string> = {
  accessibilityLabel: string;
  onSelect: (value: T) => void;
  options: readonly SettingsPickerOption<T>[];
  selectedLabel: string;
  selectedLabelStyle?: TextStyle;
  selectedValue: T;
};

export function SettingsOptionPicker<T extends string>({
  accessibilityLabel,
  onSelect,
  options,
  selectedLabel,
  selectedLabelStyle,
  selectedValue,
}: SettingsOptionPickerProps<T>) {
  const { colors } = useAppearance();
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);
  const { anchorRef, measureAnchor } = useDropdownAnchor();
  const styles = useThemedStyles(({ colors: palette, getFontFamily }) => ({
    row: {
      alignItems: 'center',
      borderBottomColor: palette.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    rowPressed: {
      backgroundColor: palette.background,
    },
    rowSelected: {
      backgroundColor: palette.background,
    },
    rowLabel: {
      color: palette.text,
      flex: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600',
    },
    selection: {
      flex: 1,
    },
    chevronWrap: {
      alignItems: 'center',
      height: 24,
      justifyContent: 'center',
      marginLeft: spacing.sm,
      width: 24,
    },
    optionsCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 12,
      borderWidth: 1,
      minWidth: 220,
      overflow: 'hidden',
    },
    optionRow: {
      alignItems: 'center',
      borderBottomColor: palette.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    optionRowLast: {
      borderBottomWidth: 0,
    },
    check: {
      color: palette.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 20,
      fontWeight: '700',
      marginLeft: spacing.sm,
      minWidth: 16,
      textAlign: 'center',
    },
  }));

  const close = () => {
    setIsOpen(false);
    setAnchor(null);
  };

  const toggleOpen = () => {
    if (isOpen) {
      close();
      return;
    }

    measureAnchor((measured) => {
      setAnchor(measured);
      setIsOpen(true);
    });
  };

  return (
    <>
      <Pressable
        ref={anchorRef}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={toggleOpen}
      >
        <Text style={[styles.rowLabel, styles.selection, selectedLabelStyle]}>
          {selectedLabel}
        </Text>
        <View style={styles.chevronWrap}>
          <Ionicons
            color={colors.textMuted}
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
          />
        </View>
      </Pressable>

      <DismissibleDropdownMenu
        anchor={anchor}
        visible={isOpen}
        onDismiss={close}
      >
        <View style={styles.optionsCard}>
          {options.map((option, index) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.optionRow,
                index === options.length - 1 && styles.optionRowLast,
                pressed && styles.rowPressed,
                option.value === selectedValue && styles.rowSelected,
              ]}
              onPress={() => {
                onSelect(option.value);
                close();
              }}
            >
              <Text style={[styles.rowLabel, option.labelStyle]}>
                {option.label}
              </Text>
              <Text style={styles.check}>
                {option.value === selectedValue ? '✓' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      </DismissibleDropdownMenu>
    </>
  );
}
