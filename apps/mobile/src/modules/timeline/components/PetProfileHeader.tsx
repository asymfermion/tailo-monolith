import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { formatPetType } from '@/lib/formatMoment';
import type { LocalPetProfile } from '@/modules/pets/petProfile';

type PetProfileHeaderProps = {
  profile: LocalPetProfile | null;
  isLoading: boolean;
};

export function PetProfileHeader({
  profile,
  isLoading,
}: PetProfileHeaderProps) {
  const [askTailoOpen, setAskTailoOpen] = useState(false);
  const petLabel = profile
    ? t('petProfile.nameWithType', {
        name: profile.name,
        type: formatPetType(profile.type),
      })
    : t('petProfile.fallbackName');

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        {profile?.profilePhotoUri ? (
          <Image
            accessibilityLabel={t('accessibility.profilePhoto', {
              name: profile.name,
            })}
            contentFit="cover"
            source={{ uri: profile.profilePhotoUri }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {profile?.name?.slice(0, 1).toUpperCase() ?? 'P'}
            </Text>
          </View>
        )}

        <View style={styles.summaryText}>
          <Text style={styles.summaryLabel}>{t('petProfile.label')}</Text>
          <Text style={styles.summaryTitle}>
            {isLoading ? t('petProfile.loading') : petLabel}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.askTailoButton}
          onPress={() => setAskTailoOpen((open) => !open)}
        >
          <Text style={styles.askTailoButtonText}>
            {t('petProfile.askTailo')}
          </Text>
        </Pressable>
      </View>

      {askTailoOpen ? (
        <View style={styles.askTailoCard}>
          <Text style={styles.askTailoTitle}>{t('petProfile.askTailo')}</Text>
          <Text style={styles.askTailoText}>
            {t('petProfile.askTailoBody')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    borderRadius: 28,
    height: 56,
    width: 56,
    backgroundColor: colors.border,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    height: 56,
    width: 56,
    backgroundColor: colors.border,
  },
  avatarPlaceholderText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '600',
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryTitle: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  askTailoButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  askTailoButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  askTailoCard: {
    marginTop: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  askTailoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  askTailoText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
