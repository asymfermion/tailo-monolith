import { Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useThemedStyles } from '@/lib/appearance';

type UserProfileHeaderProps = {
  displayName: string | null;
  email: string | null;
  subtitle: string;
};

export function UserProfileHeader({
  displayName,
  email,
  subtitle,
}: UserProfileHeaderProps) {
  const initial = (displayName?.trim() || email?.trim() || '?')
    .slice(0, 1)
    .toUpperCase();
  const primaryLine = displayName?.trim() || email || '—';
  const styles = useThemedStyles(({ colors, getFontFamily }) => ({
    card: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: spacing.md,
      padding: spacing.lg,
    },
    avatar: {
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 40,
      height: 80,
      justifyContent: 'center' as const,
      width: 80,
    },
    avatarText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 32,
      fontWeight: '600' as const,
    },
    name: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600' as const,
      marginTop: spacing.md,
      textAlign: 'center' as const,
    },
    email: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      marginTop: spacing.xs,
      textAlign: 'center' as const,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.sm,
      textAlign: 'center' as const,
    },
  }));

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <Text style={styles.name}>{primaryLine}</Text>
      {displayName?.trim() && email ? (
        <Text style={styles.email}>{email}</Text>
      ) : null}
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
