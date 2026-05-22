import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { useDialogMaxWidth } from '@/lib/responsive';

type MomentActionMenuProps = {
  onDelete: () => void;
  onEdit?: () => void;
  showEdit?: boolean;
};

function createMomentActionMenuStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    menuButton: {
      alignItems: 'center' as const,
      height: 36,
      justifyContent: 'center' as const,
      width: 36,
    },
    backdrop: {
      backgroundColor: 'rgba(28, 28, 26, 0.28)',
      flex: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.xl,
    },
    menuCard: {
      alignSelf: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden' as const,
      width: '100%' as const,
    },
    menuItem: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    menuItemText: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 16,
      fontWeight: '500' as const,
    },
    menuItemDanger: {
      color: colors.destructive,
    },
    menuDivider: {
      backgroundColor: colors.border,
      height: StyleSheet.hairlineWidth,
    },
  };
}

export function MomentActionMenu({
  onDelete,
  onEdit,
  showEdit = true,
}: MomentActionMenuProps) {
  const { colors } = useAppearance();
  const dialogMaxWidth = useDialogMaxWidth();
  const [isOpen, setIsOpen] = useState(false);
  const styles = useThemedStyles(createMomentActionMenuStyles);

  return (
    <>
      <Pressable
        accessibilityLabel={t('timeline.moment.menu')}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.menuButton}
        onPress={() => setIsOpen(true)}
      >
        <Ionicons
          color={colors.textMuted}
          name="ellipsis-horizontal"
          size={22}
        />
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={[styles.menuCard, { maxWidth: dialogMaxWidth }]}>
            {showEdit && onEdit ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={styles.menuItem}
                  onPress={() => {
                    setIsOpen(false);
                    onEdit();
                  }}
                >
                  <Ionicons
                    color={colors.text}
                    name="create-outline"
                    size={20}
                  />
                  <Text style={styles.menuItemText}>
                    {t('timeline.moment.edit')}
                  </Text>
                </Pressable>
                <View style={styles.menuDivider} />
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              style={styles.menuItem}
              onPress={() => {
                setIsOpen(false);
                onDelete();
              }}
            >
              <Ionicons
                color={colors.destructive}
                name="trash-outline"
                size={20}
              />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                {t('timeline.moment.delete')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
