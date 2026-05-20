import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';
import { formatPetType } from '@/lib/formatMoment';
import { useLocalPetProfile } from '@/modules/pets/useLocalPetProfile';

export function PetProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarContentInset = useTabBarContentInset();
  const petProfile = useLocalPetProfile();
  const [askTailoOpen, setAskTailoOpen] = useState(false);
  const profile = petProfile.profile;

  const petLabel = profile
    ? t('petProfile.nameWithType', {
        name: profile.name,
        type: formatPetType(profile.type),
      })
    : t('petProfile.fallbackName');

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: tabBarContentInset,
          paddingTop: getTabScreenTopPadding(insets.top),
        },
      ]}
      contentInsetAdjustmentBehavior="never"
      style={styles.screen}
    >
      <Text style={styles.title}>{t('navigation.tabs.PetProfile')}</Text>
      <Text style={styles.subtitle}>{t('petProfile.screenSubtitle')}</Text>

      <View style={styles.card}>
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

        <Text style={styles.petName}>
          {petProfile.isLoading ? t('petProfile.loading') : petLabel}
        </Text>

        {profile?.gender ? (
          <Text style={styles.meta}>
            {t('petProfile.genderLabel', { gender: profile.gender })}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAskTailoOpen((open) => !open)}
        >
          <Text style={styles.sectionTitle}>{t('petProfile.askTailo')}</Text>
        </Pressable>
        <Text style={styles.body}>{t('petProfile.askTailoBody')}</Text>
        {askTailoOpen ? (
          <Text style={styles.comingSoon}>{t('petProfile.askTailoSoon')}</Text>
        ) : null}
      </View>

      <Text style={styles.hint}>{t('petProfile.editHint')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  avatar: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 48,
    height: 96,
    width: 96,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarPlaceholderText: {
    color: colors.accent,
    fontSize: 36,
    fontWeight: '600',
  },
  petName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  comingSoon: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.lg,
  },
});
