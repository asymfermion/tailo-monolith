import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import {
  formatCount,
  getTimelineEmptyMessage,
  getTimelineEmptyTitle,
  t,
  useAppLocale,
} from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';
import { SaveMemoriesLink } from '@/modules/auth';
import { useAuthAccountStatus } from '@/modules/auth/useAuthAccountStatus';
import { usePhotoAccess } from '@/modules/mediaScanner';
import { shouldEnableHistoricalScan } from '@/modules/mediaScanner/scanDepthPolicy';
import { useLocalPetProfile } from '@/modules/pets/useLocalPetProfile';
import {
  getCloudTimelineBackfillStatus,
  useEventUpdatesPoll,
} from '@/modules/sync';
import { CaptureFab } from '@/modules/timeline/components/CaptureFab';
import { TimelineAnonymousUpgradeCard } from '@/modules/timeline/components/TimelineAnonymousUpgradeCard';
import { TimelineTopBar } from '@/modules/timeline/components/TimelineTopBar';
import type { TimelineListFilter } from '@/modules/timeline/components/TimelineFilterDropdown';
import { MomentPhotoViewer } from '@/modules/timeline/components/MomentPhotoViewer';
import { TimelineMomentCard } from '@/modules/timeline/components/TimelineMomentCard';
import { TimelineMomentSeparator } from '@/modules/timeline/components/TimelineMomentSeparator';
import {
  deleteMoment,
  toggleMomentFavorite,
  useTimelineEvents,
} from '@/modules/timeline';
import type { TimelineEvent } from '@/types';
import { getDatabase } from '@/db';

type TimelineListItem =
  | {
      kind: 'event';
      event: TimelineEvent;
    }
  | {
      kind: 'anonymous_upgrade';
    };

function keyExtractor(item: TimelineListItem): string {
  if (item.kind === 'event') {
    return item.event.localEventId;
  }

  return 'timeline-anonymous-upgrade';
}

function createTimelineScreenStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      backgroundColor: colors.background,
      flex: 1,
    },
    listHeaderContainer: {
      backgroundColor: colors.background,
    },
    listContent: {
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
    },
    header: {
      gap: spacing.sm,
      paddingBottom: spacing.lg,
      paddingTop: spacing.lg,
    },
    feedTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 34,
      fontWeight: '600' as const,
      lineHeight: 40,
    },
    feedSubtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
    },
    feedSectionLabel: {
      color: colors.text,
      fontFamily: getFontFamily('700'),
      fontSize: 16,
      fontWeight: '700' as const,
      marginTop: spacing.md,
    },
    backfillTip: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    backfillTipTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
    },
    backfillTipMessage: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
    },
    backfillTipDismiss: {
      alignSelf: 'flex-start' as const,
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center' as const,
      paddingVertical: spacing.xs,
    },
    backfillTipDismissText: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 13,
      fontWeight: '600' as const,
    },
    emptyState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 260,
      paddingHorizontal: spacing.md,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 21,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    emptyText: {
      marginTop: spacing.sm,
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center' as const,
    },
  };
}

export function TimelineScreen() {
  const locale = useAppLocale();
  const insets = useSafeAreaInsets();
  const topPadding = getTabScreenTopPadding(insets.top);
  const navigation = useNavigation();
  const tabBarContentInset = useTabBarContentInset();
  const account = useAuthAccountStatus();
  const petProfile = useLocalPetProfile();
  const photoAccess = usePhotoAccess({
    historicalScanEnabled: shouldEnableHistoricalScan({
      isLinkedAccount: account.isLinked,
    }),
  });
  const { colors } = useAppearance();
  const styles = useThemedStyles(createTimelineScreenStyles);
  const [timelineFilter, setTimelineFilter] =
    useState<TimelineListFilter>('all');
  const [photoViewer, setPhotoViewer] = useState<{
    media: TimelineEvent['media'];
    initialIndex: number;
  } | null>(null);
  const favoritesOnly = timelineFilter === 'favorites';
  const [timelineRefreshNonce, setTimelineRefreshNonce] = useState(0);
  const isPipelineActive =
    photoAccess.isScanning ||
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages;
  const wasPipelineActiveRef = useRef(isPipelineActive);
  const listRef = useRef<FlatList<TimelineListItem>>(null);
  const [timelineScrollY, setTimelineScrollY] = useState(0);
  const [cloudBackfillPending, setCloudBackfillPending] = useState(false);
  const [cloudBackfillTipDismissed, setCloudBackfillTipDismissed] =
    useState(false);
  const timelineRefreshKey =
    navigation.captureCompletedNonce +
    navigation.timelineChangedNonce +
    timelineRefreshNonce;
  const timeline = useTimelineEvents({
    refreshKey: timelineRefreshKey,
    favoritesOnly,
  });
  const hasTimelineValue = timeline.events.length > 0;
  const showAnonymousUpgradeMoment =
    !favoritesOnly &&
    account.session?.isAnonymous === true &&
    timeline.events.length > 0;
  const timelineItems = useMemo<TimelineListItem[]>(
    () => [
      ...timeline.events.map((event) => ({ kind: 'event' as const, event })),
      ...(showAnonymousUpgradeMoment
        ? ([
            { kind: 'anonymous_upgrade' as const },
          ] satisfies TimelineListItem[])
        : []),
    ],
    [showAnonymousUpgradeMoment, timeline.events],
  );

  useEffect(() => {
    if (wasPipelineActiveRef.current && !isPipelineActive) {
      setTimelineRefreshNonce((value) => value + 1);
    }

    wasPipelineActiveRef.current = isPipelineActive;
  }, [isPipelineActive]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ animated: true, offset: 0 });
    setTimelineScrollY(0);
  }, [navigation.timelineScrollToTopNonce]);

  const handleTimelineScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setTimelineScrollY(event.nativeEvent.contentOffset.y);
    },
    [],
  );

  const handleScrollToTop = useCallback(() => {
    navigation.scrollTimelineToTop();
  }, [navigation]);

  const handleRemoteEventUpdatesApplied = useCallback(() => {
    setTimelineRefreshNonce((value) => value + 1);
  }, []);
  const pollState = useEventUpdatesPoll({
    enabled: true,
    onApplied: handleRemoteEventUpdatesApplied,
  });
  const hasPhotoAccess =
    photoAccess.permissionStatus === 'full' ||
    photoAccess.permissionStatus === 'limited';
  const showCloudBackfillTip =
    account.isLinked &&
    hasTimelineValue &&
    cloudBackfillPending &&
    !cloudBackfillTipDismissed;

  useEffect(() => {
    let cancelled = false;

    async function reloadCloudBackfillStatus() {
      if (!account.isLinked || !hasTimelineValue) {
        if (!cancelled) {
          setCloudBackfillPending(false);
          setCloudBackfillTipDismissed(false);
        }
        return;
      }

      const database = await getDatabase();
      const status = await getCloudTimelineBackfillStatus(database);

      if (cancelled) {
        return;
      }

      const pending = status.hasHydratedTimeline && !status.isBackfillCompleted;
      setCloudBackfillPending(pending);

      if (!pending) {
        setCloudBackfillTipDismissed(false);
      }
    }

    void reloadCloudBackfillStatus();

    return () => {
      cancelled = true;
    };
  }, [
    account.isLinked,
    hasTimelineValue,
    pollState.lastAppliedCount,
    timelineRefreshKey,
  ]);

  const openMomentDetail = useCallback(
    (localEventId: string) => {
      navigation.push('EventDetail', { localEventId });
    },
    [navigation],
  );

  const openMomentPhoto = useCallback(
    (event: TimelineEvent, photoIndex: number) => {
      if (event.media.length === 0) {
        return;
      }

      setPhotoViewer({
        media: event.media,
        initialIndex: Math.min(Math.max(photoIndex, 0), event.media.length - 1),
      });
    },
    [],
  );

  const handleToggleFavorite = useCallback(
    async (localEventId: string, isFavorite: boolean) => {
      const updated = await toggleMomentFavorite(localEventId, isFavorite);
      if (updated) {
        setTimelineRefreshNonce((value) => value + 1);
      }
    },
    [],
  );

  const handleDeleteMoment = useCallback((localEventId: string) => {
    Alert.alert(
      t('timeline.moment.deleteConfirmTitle'),
      t('timeline.moment.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('timeline.moment.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await deleteMoment(localEventId);

              if (result.ok) {
                setTimelineRefreshNonce((value) => value + 1);
                return;
              }

              Alert.alert(
                t('timeline.moment.deleteFailedTitle'),
                result.errorMessage || t('timeline.moment.deleteFailedMessage'),
              );
            })();
          },
        },
      ],
    );
  }, []);

  // TODO: share-moment — export primary image (and optional caption) to the system share sheet.
  const handleShareMoment = useCallback(() => {
    Alert.alert(
      t('timeline.moment.shareSoonTitle'),
      t('timeline.moment.shareSoonMessage'),
    );
  }, []);

  const renderItem: ListRenderItem<TimelineListItem> = useCallback(
    ({ item }) => {
      if (item.kind === 'anonymous_upgrade') {
        return (
          <TimelineAnonymousUpgradeCard
            onCreateAccount={() =>
              navigation.push('AccountSettings', { mode: 'create' })
            }
          />
        );
      }

      return (
        <TimelineMomentCard
          event={item.event}
          onDelete={handleDeleteMoment}
          onEdit={openMomentDetail}
          onPress={openMomentDetail}
          onPressPhoto={openMomentPhoto}
          onShare={handleShareMoment}
          onToggleFavorite={handleToggleFavorite}
        />
      );
    },
    [
      handleDeleteMoment,
      handleShareMoment,
      handleToggleFavorite,
      navigation,
      openMomentDetail,
      openMomentPhoto,
    ],
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        colors={[colors.accent]}
        progressBackgroundColor={colors.background}
        progressViewOffset={0}
        refreshing={timeline.isLoading && !isPipelineActive}
        tintColor={colors.accent}
        onRefresh={timeline.refresh}
      />
    ),
    [
      colors.accent,
      colors.background,
      isPipelineActive,
      timeline.isLoading,
      timeline.refresh,
    ],
  );

  const listHeader = useMemo(
    () => (
      <TimelineHeader
        hasTimelineValue={hasTimelineValue}
        memoryCount={timeline.events.length}
        petName={petProfile.profile?.name.trim() || null}
        showCloudBackfillTip={showCloudBackfillTip}
        onDismissCloudBackfillTip={() => setCloudBackfillTipDismissed(true)}
      />
    ),
    [
      hasTimelineValue,
      petProfile.profile?.name,
      showCloudBackfillTip,
      timeline.events.length,
    ],
  );

  return (
    <View style={styles.screen}>
      <TimelineTopBar
        scrollOffsetY={timelineScrollY}
        topPadding={topPadding}
        timelineFilter={timelineFilter}
        onScrollToTop={handleScrollToTop}
        onTimelineFilterChange={setTimelineFilter}
      />
      <FlatList
        ref={listRef}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarContentInset },
        ]}
        contentInsetAdjustmentBehavior="never"
        data={timelineItems}
        extraData={`${locale}:${timelineRefreshKey}:${timelineItems.length}:${showAnonymousUpgradeMoment ? 'anon-cta' : 'no-cta'}`}
        initialNumToRender={6}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListEmptyComponent={
          <TimelineEmptyState
            favoritesOnly={favoritesOnly}
            hasPhotoAccess={hasPhotoAccess}
            isPipelineActive={isPipelineActive}
            isLoading={timeline.isLoading}
            permissionStatus={photoAccess.permissionStatus}
            petCandidateCount={
              photoAccess.petDetectionProgress.petCandidateCount
            }
            processedCount={photoAccess.petDetectionProgress.processedCount}
          />
        }
        ItemSeparatorComponent={TimelineMomentSeparator}
        ListHeaderComponent={listHeader}
        ListHeaderComponentStyle={styles.listHeaderContainer}
        refreshControl={refreshControl}
        renderItem={renderItem}
        scrollEventThrottle={16}
        style={styles.list}
        updateCellsBatchingPeriod={50}
        onScroll={handleTimelineScroll}
      />
      <CaptureFab onPress={() => navigation.push('Capture')} />
      {photoViewer ? (
        <MomentPhotoViewer
          initialIndex={photoViewer.initialIndex}
          media={photoViewer.media}
          visible
          onClose={() => setPhotoViewer(null)}
        />
      ) : null}
    </View>
  );
}

function TimelineHeader({
  hasTimelineValue,
  memoryCount,
  petName,
  showCloudBackfillTip,
  onDismissCloudBackfillTip,
}: {
  hasTimelineValue: boolean;
  memoryCount: number;
  petName: string | null;
  showCloudBackfillTip: boolean;
  onDismissCloudBackfillTip: () => void;
}) {
  const styles = useThemedStyles(createTimelineScreenStyles);
  const displayName = petName || t('common.yourPet');
  const memoryLabel =
    memoryCount === 1
      ? t('timeline.feed.memoryCountSingle')
      : t('timeline.feed.memoryCountPlural', {
          count: formatCount(memoryCount),
        });

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.feedTitle}>
          {t('timeline.feed.title', { name: displayName })}
        </Text>
        <Text style={styles.feedSubtitle}>{memoryLabel}</Text>
      </View>
      <SaveMemoriesLink hasTimelineValue={hasTimelineValue} />
      {showCloudBackfillTip ? (
        <View style={styles.backfillTip}>
          <Text style={styles.backfillTipTitle}>
            {t('timeline.cloudBackfill.title')}
          </Text>
          <Text style={styles.backfillTipMessage}>
            {t('timeline.cloudBackfill.message')}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.backfillTipDismiss}
            onPress={onDismissCloudBackfillTip}
          >
            <Text style={styles.backfillTipDismissText}>
              {t('timeline.cloudBackfill.dismiss')}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {hasTimelineValue ? (
        <Text style={styles.feedSectionLabel}>
          {t('timeline.feed.thisWeek')}
        </Text>
      ) : null}
    </View>
  );
}

type TimelineEmptyStateProps = {
  favoritesOnly: boolean;
  hasPhotoAccess: boolean;
  isLoading: boolean;
  isPipelineActive: boolean;
  permissionStatus: string;
  petCandidateCount: number;
  processedCount: number;
};

function TimelineEmptyState({
  favoritesOnly,
  hasPhotoAccess,
  isLoading,
  isPipelineActive,
  permissionStatus,
  petCandidateCount,
  processedCount,
}: TimelineEmptyStateProps) {
  const styles = useThemedStyles(createTimelineScreenStyles);
  const title = getTimelineEmptyTitle({
    favoritesOnly,
    hasPhotoAccess,
    isLoading,
    isPipelineActive,
    permissionStatus,
    petCandidateCount,
    processedCount,
  });
  const message = getTimelineEmptyMessage({
    favoritesOnly,
    hasPhotoAccess,
    isLoading,
    isPipelineActive,
    permissionStatus,
    petCandidateCount,
    processedCount,
  });

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}
