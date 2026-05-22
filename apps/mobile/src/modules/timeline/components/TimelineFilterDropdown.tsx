import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DismissibleDropdownMenu,
  useDropdownAnchor,
  type DropdownAnchor,
} from '@/components/DismissibleDropdownMenu';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { MIN_TOUCH_TARGET } from '@/lib/responsive';

export type TimelineListFilter = 'all' | 'favorites';

type TimelineFilterDropdownProps = {
  value: TimelineListFilter;
  onChange: (value: TimelineListFilter) => void;
};

function createTimelineFilterDropdownStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    wrapper: {
      alignItems: 'flex-end' as const,
      minHeight: MIN_TOUCH_TARGET,
      position: 'relative' as const,
      zIndex: 10,
    },
    fieldLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      textTransform: 'uppercase' as const,
    },
    trigger: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: MIN_TOUCH_TARGET,
      justifyContent: 'center' as const,
      width: MIN_TOUCH_TARGET,
    },
    triggerPressed: {
      opacity: 0.7,
    },
    triggerSelected: {
      borderColor: colors.accent,
    },
    activeDot: {
      backgroundColor: colors.accent,
      borderColor: colors.surface,
      borderRadius: 5,
      borderWidth: 1,
      height: 10,
      position: 'absolute' as const,
      right: 9,
      top: 9,
      width: 10,
    },
    options: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      elevation: 4,
      minWidth: 190,
      overflow: 'hidden' as const,
      shadowColor: colors.shadow,
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
    },
    option: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    optionPressed: {
      backgroundColor: colors.background,
    },
    optionSelected: {
      backgroundColor: colors.background,
    },
    optionText: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 16,
      fontWeight: '500' as const,
    },
    optionTextSelected: {
      fontFamily: getFontFamily('600'),
      fontWeight: '600' as const,
    },
    optionDivider: {
      backgroundColor: colors.border,
      height: StyleSheet.hairlineWidth,
    },
  };
}

export function TimelineFilterDropdown({
  value,
  onChange,
}: TimelineFilterDropdownProps) {
  const { colors } = useAppearance();
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);
  const { anchorRef, measureAnchor } = useDropdownAnchor();
  const styles = useThemedStyles(createTimelineFilterDropdownStyles);

  const selectedLabel = useMemo(
    () =>
      value === 'favorites'
        ? t('home.favoritesFilter')
        : t('home.allMomentsFilter'),
    [value],
  );

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
    <View style={styles.wrapper}>
      <Pressable
        ref={anchorRef}
        accessibilityHint={t('home.filterDropdownHint')}
        accessibilityLabel={t('home.filterDropdownLabel', {
          selection: selectedLabel,
        })}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        hitSlop={spacing.xs}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
          value === 'favorites' && styles.triggerSelected,
        ]}
        onPress={toggleOpen}
      >
        <Ionicons color={colors.accent} name="filter" size={18} />
        {value === 'favorites' ? <View style={styles.activeDot} /> : null}
      </Pressable>

      <DismissibleDropdownMenu
        anchor={anchor}
        visible={isOpen}
        onDismiss={close}
      >
        <View style={styles.options}>
          <Text style={styles.fieldLabel}>{t('home.filterLabel')}</Text>
          <FilterOption
            isSelected={value === 'all'}
            label={t('home.allMomentsFilter')}
            onPress={() => {
              onChange('all');
              close();
            }}
          />
          <View style={styles.optionDivider} />
          <FilterOption
            isSelected={value === 'favorites'}
            label={t('home.favoritesFilter')}
            onPress={() => {
              onChange('favorites');
              close();
            }}
          />
        </View>
      </DismissibleDropdownMenu>
    </View>
  );
}

function FilterOption({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createTimelineFilterDropdownStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
        isSelected && styles.optionSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.optionText, isSelected && styles.optionTextSelected]}
      >
        {label}
      </Text>
      {isSelected ? (
        <Ionicons color={colors.accent} name="checkmark" size={20} />
      ) : null}
    </Pressable>
  );
}
