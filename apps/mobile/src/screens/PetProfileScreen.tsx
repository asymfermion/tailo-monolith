import { Ionicons } from '@expo/vector-icons';
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
import { formatCount, getIntlLocale, t, useAppLocale } from '@/i18n';
import { formatPetType } from '@/lib/formatMoment';
import { formatPetBirthdayLabel } from '@/lib/formatPetBirthday';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
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
      paddingHorizontal: 0,
    },
    contentGutter: {
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
      overflow: 'hidden' as const,
      position: 'relative' as const,
    },
    heroMedia: {
      position: 'relative' as const,
    },
    heroImage: {
      aspectRatio: 0.86,
      backgroundColor: colors.border,
      width: '100%' as const,
    },
    heroPlaceholder: {
      alignItems: 'center' as const,
      aspectRatio: 0.86,
      backgroundColor: colors.border,
      justifyContent: 'center' as const,
      width: '100%' as const,
    },
    heroPlaceholderText: {
      color: colors.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 54,
      fontWeight: '700' as const,
    },
    heroOverlay: {
      backgroundColor: 'rgba(28, 28, 26, 0.34)',
      bottom: 0,
      left: 0,
      paddingBottom: 82,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      position: 'absolute' as const,
      right: 0,
    },
    heroName: {
      color: '#FFFFFF',
      fontFamily: getFontFamily('700'),
      fontSize: 42,
      fontWeight: '700' as const,
      lineHeight: 48,
    },
    heroMeta: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontFamily: getFontFamily('500'),
      fontSize: 15,
      fontWeight: '500' as const,
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    summaryContent: {
      gap: spacing.md,
      marginTop: -72,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    statsPanel: {
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
      borderColor: 'rgba(255, 255, 255, 0.72)',
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row' as const,
      overflow: 'hidden' as const,
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
      paddingRight: 56,
    },
    summaryTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 24,
      fontWeight: '600' as const,
      minWidth: 0,
    },
    summaryTopAction: {
      alignItems: 'center' as const,
      backgroundColor: 'rgba(255, 255, 255, 0.86)',
      borderRadius: 22,
      height: 44,
      justifyContent: 'center' as const,
      position: 'absolute' as const,
      right: spacing.lg,
      top: spacing.lg,
      width: 44,
      zIndex: 1,
    },
    summaryTopActionPressed: {
      opacity: 0.78,
    },
    summaryMeta: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    summaryEyebrow: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0,
      marginBottom: spacing.sm,
      textTransform: 'uppercase' as const,
    },
    summaryDivider: {
      backgroundColor: colors.border,
      height: 1,
    },
    statCard: {
      alignItems: 'center' as const,
      flex: 1,
      minWidth: 0,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.md,
    },
    statDivider: {
      backgroundColor: colors.border,
      opacity: 0.8,
      width: 1,
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
      fontFamily: getFontFamily('700'),
      fontSize: 17,
      fontWeight: '700' as const,
      lineHeight: 22,
      marginTop: spacing.xs,
      textAlign: 'center' as const,
    },
    statIcon: {
      marginBottom: spacing.xs,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0,
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
    highlightList: {
      marginHorizontal: -spacing.lg,
    },
    highlightContent: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    highlightCard: {
      backgroundColor: colors.border,
      borderRadius: 16,
      height: 124,
      overflow: 'hidden' as const,
      position: 'relative' as const,
      width: 112,
    },
    highlightImage: {
      height: '100%' as const,
      width: '100%' as const,
    },
    highlightOverlay: {
      backgroundColor: 'rgba(28, 28, 26, 0.44)',
      bottom: 0,
      left: 0,
      padding: spacing.sm,
      position: 'absolute' as const,
      right: 0,
    },
    highlightTitle: {
      color: '#FFFFFF',
      fontFamily: getFontFamily('700'),
      fontSize: 13,
      fontWeight: '700' as const,
      lineHeight: 17,
    },
    highlightBody: {
      color: 'rgba(255, 255, 255, 0.88)',
      fontFamily: getFontFamily('500'),
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 15,
      marginTop: 2,
    },
    timelineList: {
      gap: spacing.md,
    },
    timelineRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.md,
      minHeight: 58,
    },
    timelineMarker: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      width: 34,
    },
    timelineDot: {
      alignItems: 'center' as const,
      backgroundColor: colors.background,
      borderRadius: 17,
      height: 34,
      justifyContent: 'center' as const,
      width: 34,
    },
    timelineLine: {
      backgroundColor: colors.border,
      flex: 1,
      marginTop: spacing.xs,
      width: 1,
    },
    timelineCopy: {
      flex: 1,
      minWidth: 0,
    },
    timelineTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    timelineBody: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
    timelineThumb: {
      backgroundColor: colors.border,
      borderRadius: 8,
      height: 44,
      overflow: 'hidden' as const,
      width: 44,
    },
  };
}

export function PetProfileScreen() {
  const locale = useAppLocale();
  const insets = useSafeAreaInsets();
  const tabBarContentInset = useTabBarContentInset();
  const navigation = useNavigation();
  const petProfile = useLocalPetProfile();
  const { colors } = useAppearance();
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
  const displayName = profile?.name.trim() || t('petProfile.fallbackName');
  const aboutText = profile
    ? t('petProfile.aboutBody', {
        name: displayName,
        type: formatPetType(profile.type).toLowerCase(),
        birthday: formatPetBirthdayLabel(profile.birthday, locale),
      })
    : t('petProfile.emptyState');
  const profileCreatedLabel = profile
    ? formatProfileDate(profile.createdAt)
    : t('petProfile.storyLoading');
  const memoryStatValue = storySummary.isLoading
    ? '...'
    : formatCount(storySummary.eventCount);

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
      <View style={styles.summaryCard}>
        <View style={styles.heroMedia}>
          <Pressable
            accessibilityHint={t('petProfile.detailsTitle')}
            accessibilityLabel={t('petProfile.editDetails')}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.summaryTopAction,
              pressed && styles.summaryTopActionPressed,
            ]}
            onPress={() => navigation.push('PetProfileDetails')}
          >
            <Ionicons color={colors.accent} name="create" size={20} />
          </Pressable>

          {profile?.profilePhotoUri ? (
            <Image
              accessibilityLabel={t('accessibility.profilePhoto', {
                name: displayName,
              })}
              contentFit="cover"
              source={{ uri: profile.profilePhotoUri }}
              style={styles.heroImage}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>{avatarInitial}</Text>
            </View>
          )}

          <View style={styles.heroOverlay}>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroMeta}>{summaryMeta}</Text>
          </View>
        </View>

        <View style={styles.summaryContent}>
          <View style={styles.statsPanel}>
            <PetStatTile
              icon="book-outline"
              label={t('petProfile.statMemories')}
              value={memoryStatValue}
            />
            <View style={styles.statDivider} />
            <PetStatTile
              icon="calendar-clear-outline"
              label={t('petProfile.statTogether')}
              value={t('petProfile.mockTogetherValue')}
            />
            <View style={styles.statDivider} />
            <PetStatTile
              icon="paw-outline"
              label={t('petProfile.statAdventures')}
              value={t('petProfile.mockAdventureValue')}
            />
            <View style={styles.statDivider} />
            <PetStatTile
              icon="heart-outline"
              label={t('petProfile.statFavorites')}
              value={t('petProfile.mockFavoriteValue')}
            />
          </View>
        </View>
      </View>

      <View style={styles.contentGutter}>
        <Text style={styles.sectionLabel}>{t('petProfile.aboutTitle')}</Text>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('petProfile.aboutTitle')}</Text>
          <Text style={styles.body}>{aboutText}</Text>
        </View>
      </View>

      <View style={styles.contentGutter}>
        <Text style={styles.sectionLabel}>
          {t('petProfile.highlightsTitle')}
        </Text>
        <ScrollView
          horizontal
          contentContainerStyle={styles.highlightContent}
          showsHorizontalScrollIndicator={false}
          style={styles.highlightList}
        >
          <HighlightCard
            body={t('petProfile.highlightBeachBody')}
            imageUri={profile?.profilePhotoUri ?? null}
            title={t('petProfile.highlightBeachTitle')}
          />
          <HighlightCard
            body={t('petProfile.highlightParkBody')}
            imageUri={profile?.profilePhotoUri ?? null}
            title={t('petProfile.highlightParkTitle')}
          />
          <HighlightCard
            body={t('petProfile.highlightLazyBody')}
            imageUri={profile?.profilePhotoUri ?? null}
            title={t('petProfile.highlightLazyTitle')}
          />
        </ScrollView>
      </View>

      <View style={styles.contentGutter}>
        <Text style={styles.sectionLabel}>
          {t('petProfile.lifeTimelineTitle')}
        </Text>
        <View style={styles.card}>
          <View style={styles.timelineList}>
            <LifeTimelineRow
              icon="calendar-clear-outline"
              imageUri={profile?.profilePhotoUri ?? null}
              title={t('petProfile.timelineProfileCreated')}
              body={profileCreatedLabel}
            />
            <LifeTimelineRow
              icon="sparkles-outline"
              imageUri={profile?.profilePhotoUri ?? null}
              isLast
              title={t('petProfile.timelineLatestMemory')}
              body={latestMemoryLabel}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function PetStatTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createPetProfileScreenStyles);

  return (
    <View style={styles.statCard}>
      <Ionicons
        color={colors.text}
        name={icon}
        size={18}
        style={styles.statIcon}
      />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function HighlightCard({
  body,
  imageUri,
  title,
}: {
  body: string;
  imageUri: string | null;
  title: string;
}) {
  const styles = useThemedStyles(createPetProfileScreenStyles);

  return (
    <View style={styles.highlightCard}>
      {imageUri ? (
        <Image
          accessibilityLabel={title}
          contentFit="cover"
          source={{ uri: imageUri }}
          style={styles.highlightImage}
        />
      ) : null}
      <View style={styles.highlightOverlay}>
        <Text style={styles.highlightTitle}>{title}</Text>
        <Text style={styles.highlightBody}>{body}</Text>
      </View>
    </View>
  );
}

function LifeTimelineRow({
  body,
  icon,
  imageUri,
  isLast = false,
  title,
}: {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  imageUri: string | null;
  isLast?: boolean;
  title: string;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createPetProfileScreenStyles);

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineMarker}>
        <View style={styles.timelineDot}>
          <Ionicons color={colors.accent} name={icon} size={17} />
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineCopy}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineBody}>{body}</Text>
      </View>
      {imageUri ? (
        <Image
          accessibilityLabel={title}
          contentFit="cover"
          source={{ uri: imageUri }}
          style={styles.timelineThumb}
        />
      ) : null}
    </View>
  );
}

function formatProfileDate(timestamp: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
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
