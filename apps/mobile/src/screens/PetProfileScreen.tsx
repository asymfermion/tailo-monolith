import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { getDatabase } from '@/db';
import {
  getLocalEventCount,
  getNewestPromotedEventTimestamp,
} from '@/db/localEvents';
import { spacing } from '@/constants/theme';
import { formatCount, getIntlLocale, t } from '@/i18n';
import { formatPetType } from '@/lib/formatMoment';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';
import { useNavigation } from '@/navigation/NavigationContext';
import { useLocalPetProfile } from '@/modules/pets/useLocalPetProfile';
import type { LocalPetGender } from '@/modules/pets';

type PetStorySummary = {
  isLoading: boolean;
  eventCount: number;
  newestTimestamp: string | null;
};

function createPetProfileScreenStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 28,
      fontWeight: '600' as const,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      marginTop: spacing.lg,
      overflow: 'hidden' as const,
      padding: spacing.lg,
    },
    summaryHeader: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.md,
    },
    summaryAvatar: {
      backgroundColor: colors.border,
      borderRadius: 36,
      height: 72,
      width: 72,
    },
    summaryAvatarPlaceholder: {
      alignItems: 'center' as const,
      backgroundColor: colors.border,
      borderRadius: 36,
      height: 72,
      justifyContent: 'center' as const,
      width: 72,
    },
    summaryAvatarPlaceholderText: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 28,
      fontWeight: '600' as const,
    },
    summaryHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    summaryEyebrow: {
      color: colors.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    summaryTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 24,
      fontWeight: '600' as const,
      marginTop: spacing.xs,
    },
    summaryMeta: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    summaryDivider: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: spacing.lg,
    },
    statsRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.md,
    },
    summaryActionButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.background,
      borderRadius: 14,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: spacing.lg,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    summaryActionButtonPressed: {
      opacity: 0.78,
    },
    summaryActionText: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    summaryActionChevron: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 24,
      marginLeft: spacing.md,
    },
    statCard: {
      backgroundColor: colors.background,
      borderRadius: 14,
      flexBasis: 140,
      flexGrow: 1,
      minWidth: 0,
      padding: spacing.md,
    },
    statLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 12,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    },
    statValue: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
      marginTop: spacing.sm,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0.6,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      textTransform: 'uppercase' as const,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: spacing.lg,
      padding: spacing.lg,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 17,
      fontWeight: '600' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.sm,
    },
    comingSoon: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: spacing.md,
    },
  };
}

export function PetProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarContentInset = useTabBarContentInset();
  const navigation = useNavigation();
  const petProfile = useLocalPetProfile();
  const [askTailoOpen, setAskTailoOpen] = useState(false);
  const [storySummary, setStorySummary] = useState<PetStorySummary>({
    isLoading: true,
    eventCount: 0,
    newestTimestamp: null,
  });
  const previousModalDepthRef = useRef(navigation.modalStack.length);
  const styles = useThemedStyles(createPetProfileScreenStyles);
  const profile = petProfile.profile;
  const isProfileLoading = petProfile.isLoading;
  const refreshProfile = petProfile.refresh;
  const modalDepth = navigation.modalStack.length;

  const loadStorySummary = useCallback(async () => {
    const database = await getDatabase();
    const [eventCount, newestTimestamp] = await Promise.all([
      getLocalEventCount(database),
      getNewestPromotedEventTimestamp(database),
    ]);

    setStorySummary({
      isLoading: false,
      eventCount,
      newestTimestamp,
    });
  }, []);

  useEffect(() => {
    if (isProfileLoading) {
      return;
    }

    setStorySummary((current) => ({
      ...current,
      isLoading: true,
    }));

    void loadStorySummary();
  }, [isProfileLoading, loadStorySummary, profile?.petId]);

  useEffect(() => {
    const previousModalDepth = previousModalDepthRef.current;
    const currentModalDepth = modalDepth;

    previousModalDepthRef.current = currentModalDepth;

    if (previousModalDepth <= currentModalDepth) {
      return;
    }

    void refreshProfile();
    void loadStorySummary();
  }, [loadStorySummary, modalDepth, refreshProfile]);

  const summaryMeta = useMemo(() => {
    if (!profile) {
      return t('petProfile.emptyState');
    }

    return [formatPetType(profile.type), formatPetGender(profile.gender)]
      .filter(Boolean)
      .join(' · ');
  }, [profile]);

  const momentCountLabel = useMemo(() => {
    if (storySummary.isLoading) {
      return t('petProfile.storyLoading');
    }

    if (storySummary.eventCount === 1) {
      return t('petProfile.storyMomentCountSingle');
    }

    return t('petProfile.storyMomentCountPlural', {
      count: formatCount(storySummary.eventCount),
    });
  }, [storySummary.eventCount, storySummary.isLoading]);

  const latestMemoryLabel = useMemo(() => {
    if (storySummary.isLoading) {
      return t('petProfile.storyLoading');
    }

    if (!storySummary.newestTimestamp) {
      return t('petProfile.storyLatestEmpty');
    }

    return new Intl.DateTimeFormat(getIntlLocale(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(storySummary.newestTimestamp));
  }, [storySummary.isLoading, storySummary.newestTimestamp]);

  const avatarInitial = profile?.name.trim().slice(0, 1).toUpperCase() || 'P';

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

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          {profile?.profilePhotoUri ? (
            <Image
              accessibilityLabel={t('accessibility.profilePhoto', {
                name: profile.name.trim() || t('petProfile.fallbackName'),
              })}
              contentFit="cover"
              source={{ uri: profile.profilePhotoUri }}
              style={styles.summaryAvatar}
            />
          ) : (
            <View style={styles.summaryAvatarPlaceholder}>
              <Text style={styles.summaryAvatarPlaceholderText}>
                {avatarInitial}
              </Text>
            </View>
          )}
          <View style={styles.summaryHeaderText}>
            <Text style={styles.summaryEyebrow}>
              {t('petProfile.storyEyebrow')}
            </Text>
            <Text style={styles.summaryTitle}>
              {profile?.name.trim() || t('petProfile.fallbackName')}
            </Text>
            <Text style={styles.summaryMeta}>{summaryMeta}</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('petProfile.storyMoments')}</Text>
            <Text style={styles.statValue}>{momentCountLabel}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('petProfile.storyLatest')}</Text>
            <Text style={styles.statValue}>{latestMemoryLabel}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.summaryActionButton,
            pressed && styles.summaryActionButtonPressed,
          ]}
          onPress={() => navigation.push('PetProfileDetails')}
        >
          <Text style={styles.summaryActionText}>
            {t('petProfile.editDetails')}
          </Text>
          <Text style={styles.summaryActionChevron}>›</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>{t('petProfile.askTailo')}</Text>
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
    </ScrollView>
  );
}

function formatPetGender(gender: LocalPetGender | null): string | null {
  switch (gender) {
    case 'female':
      return t('petProfile.genders.female');
    case 'male':
      return t('petProfile.genders.male');
    case 'unknown':
      return t('petProfile.genders.unknown');
    default:
      return null;
  }
}
