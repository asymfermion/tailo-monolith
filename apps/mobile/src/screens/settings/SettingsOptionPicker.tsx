import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native';

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
  label?: string;
  onSelect: (value: T) => void;
  options: readonly SettingsPickerOption<T>[];
  selectedLabel: string;
  selectedLabelStyle?: TextStyle;
  selectedValue: T;
  showDivider?: boolean;
};

export function SettingsOptionPicker<T extends string>({
  accessibilityLabel,
  label,
  onSelect,
  options,
  selectedLabel,
  selectedLabelStyle,
  selectedValue,
  showDivider = false,
}: SettingsOptionPickerProps<T>) {
  const { colors } = useAppearance();
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);
  const { anchorRef, measureAnchor } = useDropdownAnchor();
  const styles = useThemedStyles(({ colors: palette, getFontFamily }) => ({
    anchor: {
      alignSelf: 'stretch',
      position: 'relative',
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 52,
      paddingHorizontal: spacing.md,
      paddingVertical: 0,
    },
    rowPressed: {
      backgroundColor: palette.background,
    },
    rowSelected: {
      backgroundColor: palette.background,
    },
    rowDivider: {
      backgroundColor: palette.border,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      left: spacing.md,
      position: 'absolute',
      right: spacing.md,
    },
    rowLabel: {
      color: palette.text,
      flex: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 20,
    },
    selection: {
      flex: 1,
    },
    rowValue: {
      color: palette.textMuted,
      flexShrink: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 20,
      marginLeft: spacing.md,
      maxWidth: 120,
      textAlign: 'right',
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
      borderRadius: 16,
      borderWidth: 1,
      elevation: 8,
      minWidth: 280,
      overflow: 'hidden',
      shadowColor: palette.shadow,
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
    },
    optionRow: {
      alignItems: 'center',
      borderBottomColor: palette.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      minHeight: 52,
      paddingHorizontal: 20,
      paddingVertical: 0,
    },
    optionRowLast: {
      borderBottomWidth: 0,
    },
    check: {
      color: palette.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
      marginLeft: spacing.sm,
      minWidth: 20,
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
      <View ref={anchorRef} collapsable={false} style={styles.anchor}>
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={toggleOpen}
        >
          {label ? (
            <>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={[styles.rowValue, selectedLabelStyle]}>
                {selectedLabel}
              </Text>
            </>
          ) : (
            <Text
              style={[styles.rowLabel, styles.selection, selectedLabelStyle]}
            >
              {selectedLabel}
            </Text>
          )}
          <View style={styles.chevronWrap}>
            <Ionicons
              color={colors.textMuted}
              name={isOpen ? 'chevron-down' : 'chevron-forward'}
              size={20}
            />
          </View>
        </Pressable>
        {showDivider ? <View style={styles.rowDivider} /> : null}
      </View>

      <DismissibleDropdownMenu
        anchor={anchor}
        menuWidth={280}
        minMenuWidth={220}
        placement="center"
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
