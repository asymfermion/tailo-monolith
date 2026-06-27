import { spacing } from '@/constants/theme';
import { getFontFamilyForStyle } from '@/constants/typography';
import type { AppearanceContextValue } from '@/lib/appearance';
import { MIN_TOUCH_TARGET } from '@/lib/responsive';

export function createAccountAuthStyles({
  colors,
  getFontFamily,
  theme,
}: AppearanceContextValue) {
  const disabledPrimaryButtonColor = theme === 'dark' ? '#6E6862' : '#A69B8F';

  return {
    headlineBlock: {
      alignSelf: 'stretch' as const,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamilyForStyle('elegant', '500'),
      fontSize: 40,
      fontWeight: '500' as const,
      lineHeight: 43,
      textAlign: 'left' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'left' as const,
    },
    form: {
      alignSelf: 'stretch' as const,
    },
    labelRow: {
      marginBottom: spacing.xs,
    },
    fieldLabel: {
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      fontWeight: '400' as const,
    },
    codeHint: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    input: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: 0,
    },
    primaryButton: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: colors.text,
      borderRadius: 999,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    primaryButtonDisabled: {
      backgroundColor: disabledPrimaryButtonColor,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 21,
    },
    primaryButtonTextDisabled: {
      color: colors.surface,
      opacity: 0.82,
    },
    socialControls: {
      alignSelf: 'stretch' as const,
    },
    signInAction: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    signInText: {
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center' as const,
    },
    signInLink: {
      fontFamily: getFontFamily('600'),
      fontWeight: '600' as const,
      textDecorationLine: 'underline' as const,
    },
    secondaryAction: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    secondaryActionText: {
      color: colors.text,
      fontFamily: getFontFamily('500'),
      fontSize: 14,
      fontWeight: '500' as const,
      textDecorationLine: 'underline' as const,
    },
    errorText: {
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.md,
    },
  };
}

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
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      fontWeight: '400' as const,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
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
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 20,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      paddingVertical: 0,
    },
    primaryButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 29,
      justifyContent: 'center' as const,
      marginTop: spacing.lg,
      minHeight: 58,
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 21,
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
    loadingState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 260,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center' as const,
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
