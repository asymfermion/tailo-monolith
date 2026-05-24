import { spacing } from '@/constants/theme';
import type { AppearanceContextValue } from '@/lib/appearance';

export function createAccountSettingsStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 24,
      fontWeight: '600' as const,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0.6,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      textTransform: 'uppercase' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.sm,
    },
    fieldLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    profileFieldLabel: {
      marginTop: spacing.xl,
    },
    codeHint: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    primaryButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 12,
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    secondaryAction: {
      alignItems: 'center' as const,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    secondaryActionText: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    errorText: {
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.md,
    },
    successText: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: spacing.md,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: spacing.lg,
      overflow: 'hidden' as const,
    },
    profileRow: {
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    profileRowLast: {
      borderBottomWidth: 0,
    },
    profileLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    profileValue: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      marginTop: spacing.xs,
    },
    localeRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    localeChip: {
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    localeChipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    localeChipText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
    },
    localeChipTextSelected: {
      color: colors.surface,
    },
  };
}

export type AccountSettingsStyles = ReturnType<
  typeof createAccountSettingsStyles
>;
