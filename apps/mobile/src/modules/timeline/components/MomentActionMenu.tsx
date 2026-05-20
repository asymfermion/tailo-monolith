import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';

type MomentActionMenuProps = {
  onDelete: () => void;
  onEdit?: () => void;
  showEdit?: boolean;
};

export function MomentActionMenu({
  onDelete,
  onEdit,
  showEdit = true,
}: MomentActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          <View style={styles.menuCard}>
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
              <Ionicons color="#8A3A2B" name="trash-outline" size={20} />
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

const styles = StyleSheet.create({
  menuButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  backdrop: {
    backgroundColor: 'rgba(28, 28, 26, 0.28)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  menuCard: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 280,
    overflow: 'hidden',
    width: '100%',
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemDanger: {
    color: '#8A3A2B',
  },
  menuDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
  },
});
