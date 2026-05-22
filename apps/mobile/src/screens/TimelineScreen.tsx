import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import {
  formatCount,
  getHomeStatusTitle,
  getPhotoPermissionStatusLabel,
  getPhotoPermissionStatusMessage,
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
import { usePhotoAccess } from '@/modules/mediaScanner';
import {
  SyncStatusIndicator,
  useEventUpdatesPoll,
  useSyncStatus,
} from '@/modules/sync';
import { CaptureFab } from '@/modules/timeline/components/CaptureFab';
import {
  TimelineFilterDropdown,
  type TimelineListFilter,
} from '@/modules/timeline/components/TimelineFilterDropdown';
import { MomentPhotoViewer } from '@/modules/timeline/components/MomentPhotoViewer';
import { TimelineMomentCard } from '@/modules/timeline/components/TimelineMomentCard';
import { TimelineMomentSeparator } from '@/modules/timeline/components/TimelineMomentSeparator';
import {
  deleteMoment,
  toggleMomentFavorite,
  useTimelineEvents,
} from '@/modules/timeline';
import type { TimelineEvent } from '@/types';

function keyExtractor(item: TimelineEvent): string {
  return item.localEventId;
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
      paddingBottom: spacing.md,
    },
    headerIntro: {
      alignItems: 'flex-start' as const,
      flexDirection: 'row' as const,
      gap: spacing.md,
      justifyContent: 'space-between' as const,
    },
    headerTitleBlock: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 30,
      fontFamily: getFontFamily('600'),
      fontWeight: '600' as const,
      color: colors.text,
    },
    subtitle: {
      marginTop: spacing.xs,
      fontFamily: getFontFamily('400'),
      fontSize: 16,
      lineHeight: 23,
      color: colors.textMuted,
    },
    statusBand: {
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      backgroundColor: colors.surface,
      padding: spacing.md,
    },
    statusLabel: {
      color: colors.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    statusTitle: {
      marginTop: spacing.sm,
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 19,
      fontWeight: '600' as const,
      lineHeight: 25,
    },
    statusText: {
      marginTop: spacing.sm,
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    primaryButton: {
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      marginTop: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    progressBlock: {
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    progressValue: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    progressHint: {
      marginTop: spacing.xs,
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
    },
    progressSubhint: {
      marginTop: spacing.xs,
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 12,
      lineHeight: 17,
    },
    error: {
      marginTop: spacing.md,
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
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
  const photoAccess = usePhotoAccess();
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
  const timelineRefreshKey =
    navigation.captureCompletedNonce +
    navigation.timelineChangedNonce +
    timelineRefreshNonce;
  const timeline = useTimelineEvents({
    refreshKey: timelineRefreshKey,
    favoritesOnly,
  });

  useEffect(() => {
    if (wasPipelineActiveRef.current && !isPipelineActive) {
      setTimelineRefreshNonce((value) => value + 1);
    }

    wasPipelineActiveRef.current = isPipelineActive;
  }, [isPipelineActive]);

  const handleRemoteEventUpdatesApplied = useCallback(() => {
    setTimelineRefreshNonce((value) => value + 1);
  }, []);
  const eventUpdatesPoll = useEventUpdatesPoll({
    enabled: true,
    onApplied: handleRemoteEventUpdatesApplied,
  });
  const syncStatus = useSyncStatus({
    isPolling: eventUpdatesPoll.isPolling,
  });
  const hasPhotoAccess =
    photoAccess.permissionStatus === 'full' ||
    photoAccess.permissionStatus === 'limited';

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

  const renderItem: ListRenderItem<TimelineEvent> = useCallback(
    ({ item }) => (
      <TimelineMomentCard
        event={item}
        onDelete={handleDeleteMoment}
        onEdit={openMomentDetail}
        onPress={openMomentDetail}
        onPressPhoto={openMomentPhoto}
        onShare={handleShareMoment}
        onToggleFavorite={handleToggleFavorite}
      />
    ),
    [
      handleDeleteMoment,
      handleShareMoment,
      handleToggleFavorite,
      openMomentDetail,
      openMomentPhoto,
    ],
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        colors={[colors.accent]}
        progressBackgroundColor={colors.background}
        progressViewOffset={topPadding}
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
      topPadding,
    ],
  );

  const listHeader = useMemo(
    () => (
      <TimelineHeader
        topPadding={topPadding}
        canAskAgain={photoAccess.canAskAgain}
        errorMessage={photoAccess.errorMessage ?? timeline.errorMessage}
        isPipelineActive={isPipelineActive}
        onRequestAccess={photoAccess.requestAccess}
        onTimelineFilterChange={setTimelineFilter}
        timelineFilter={timelineFilter}
        photoAccess={photoAccess}
        timelineEventCount={timeline.events.length}
        timelineIsLoading={timeline.isLoading}
        syncHasPendingMemories={syncStatus.hasPendingMemories}
        syncIsActive={syncStatus.isSyncing}
      />
    ),
    [
      timelineFilter,
      isPipelineActive,
      photoAccess,
      topPadding,
      syncStatus.hasPendingMemories,
      syncStatus.isSyncing,
      timeline.errorMessage,
      timeline.events.length,
      timeline.isLoading,
    ],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarContentInset },
        ]}
        contentInsetAdjustmentBehavior="never"
        data={timeline.events}
        extraData={locale}
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
        style={styles.list}
        updateCellsBatchingPeriod={50}
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

type TimelineHeaderProps = {
  topPadding: number;
  canAskAgain: boolean;
  errorMessage: string | null;
  timelineFilter: TimelineListFilter;
  isPipelineActive: boolean;
  onRequestAccess: () => Promise<void>;
  onTimelineFilterChange: (value: TimelineListFilter) => void;
  photoAccess: ReturnType<typeof usePhotoAccess>;
  timelineEventCount: number;
  timelineIsLoading: boolean;
  syncHasPendingMemories: boolean;
  syncIsActive: boolean;
};

function TimelineHeader({
  topPadding,
  canAskAgain,
  errorMessage,
  timelineFilter,
  isPipelineActive,
  onRequestAccess,
  onTimelineFilterChange,
  photoAccess,
  timelineEventCount,
  timelineIsLoading,
  syncHasPendingMemories,
  syncIsActive,
}: TimelineHeaderProps) {
  const styles = useThemedStyles(createTimelineScreenStyles);

  return (
    <View style={[styles.header, { paddingTop: topPadding }]}>
      <View style={styles.headerIntro}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.title}>{t('common.appName')}</Text>
          <Text style={styles.subtitle}>{t('home.momentsSubtitle')}</Text>
        </View>

        <TimelineFilterDropdown
          value={timelineFilter}
          onChange={onTimelineFilterChange}
        />
      </View>

      <SyncStatusIndicator
        hasPendingMemories={syncHasPendingMemories}
        isSyncing={syncIsActive}
      />

      <View style={styles.statusBand}>
        <Text style={styles.statusLabel}>
          {getPhotoPermissionStatusLabel(photoAccess.permissionStatus)}
        </Text>
        <Text style={styles.statusTitle}>
          {getHomeStatusTitle({
            favoritesOnly: timelineFilter === 'favorites',
            permissionStatus: photoAccess.permissionStatus,
            isScanning: photoAccess.isScanning,
            isDetectingPets: photoAccess.isDetectingPets,
            isClusteringEvents: photoAccess.isClusteringEvents,
            isSelectingImages: photoAccess.isSelectingImages,
            scannedCount: photoAccess.progress.scannedCount,
            processedCount: photoAccess.petDetectionProgress.processedCount,
            petCandidateCount:
              photoAccess.petDetectionProgress.petCandidateCount,
            eventCandidateCount:
              photoAccess.eventClusteringProgress.eventCandidateCount,
            selectedAssetCount:
              photoAccess.bestImageSelectionProgress.selectedAssetCount,
            timelineEventCount,
            timelineIsLoading,
          })}
        </Text>
        <Text style={styles.statusText}>
          {getPhotoPermissionStatusMessage(
            photoAccess.permissionStatus,
            canAskAgain,
          )}
        </Text>

        {photoAccess.permissionStatus === 'undetermined' ? (
          <PrimaryButton
            label={t('common.choosePhotos')}
            onPress={onRequestAccess}
          />
        ) : null}

        {photoAccess.permissionStatus === 'denied' && canAskAgain ? (
          <PrimaryButton
            label={t('common.choosePhotos')}
            onPress={onRequestAccess}
          />
        ) : null}

        {isPipelineActive ? (
          <PipelineProgress photoAccess={photoAccess} />
        ) : null}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>

      <SaveMemoriesLink />
    </View>
  );
}

function PipelineProgress({
  photoAccess,
}: {
  photoAccess: ReturnType<typeof usePhotoAccess>;
}) {
  const styles = useThemedStyles(createTimelineScreenStyles);

  if (photoAccess.isScanning) {
    return (
      <ProgressLine
        label={t('home.progressRecentPhotosChecked', {
          count: formatCount(photoAccess.progress.scannedCount),
        })}
        value={t('home.progressBatch', {
          batch: Math.max(photoAccess.progress.batchCount, 1),
        })}
      />
    );
  }

  if (photoAccess.isDetectingPets) {
    const { processedCount, totalCount, petCandidateCount } =
      photoAccess.petDetectionProgress;
    const progressValue =
      totalCount > 0
        ? t('home.progressPhotosOfTotal', {
            processed: formatCount(processedCount),
            total: formatCount(totalCount),
          })
        : t('home.progressPhotosChecked', {
            count: formatCount(processedCount),
          });
    const candidateHint =
      petCandidateCount > 0
        ? t('home.progressPossiblePetMoments', {
            count: formatCount(petCandidateCount),
          })
        : t('home.progressLargeLibraryHint');

    return (
      <ProgressLine
        label={t('home.progressFindingPetMoments')}
        value={progressValue}
        hint={candidateHint}
      />
    );
  }

  if (photoAccess.isClusteringEvents) {
    return (
      <ProgressLine
        label={t('home.progressBuildingTimeline')}
        value={t('home.progressMomentsPrepared', {
          count: formatCount(
            photoAccess.eventClusteringProgress.eventCandidateCount,
          ),
        })}
      />
    );
  }

  if (photoAccess.isSelectingImages) {
    return (
      <ProgressLine
        label={t('home.progressChoosingPhotos')}
        value={t('home.progressPhotosSelected', {
          count: formatCount(
            photoAccess.bestImageSelectionProgress.selectedAssetCount,
          ),
        })}
      />
    );
  }

  return null;
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

function PrimaryButton({ label, onPress }: ButtonProps) {
  const styles = useThemedStyles(createTimelineScreenStyles);

  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function ProgressLine({
  hint,
  label,
  value,
}: {
  hint?: string;
  label: string;
  value: string;
}) {
  const styles = useThemedStyles(createTimelineScreenStyles);

  return (
    <View style={styles.progressBlock}>
      <Text style={styles.progressValue}>{label}</Text>
      <Text style={styles.progressHint}>{value}</Text>
      {hint ? <Text style={styles.progressSubhint}>{hint}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
};
