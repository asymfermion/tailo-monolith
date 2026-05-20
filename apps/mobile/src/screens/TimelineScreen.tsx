import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';
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
import { TimelineMomentCard } from '@/modules/timeline/components/TimelineMomentCard';
import { TimelineMomentSeparator } from '@/modules/timeline/components/TimelineMomentSeparator';
import { toggleMomentFavorite, useTimelineEvents } from '@/modules/timeline';
import type { TimelineEvent } from '@/types';

function keyExtractor(item: TimelineEvent): string {
  return item.localEventId;
}

export function TimelineScreen() {
  const locale = useAppLocale();
  const insets = useSafeAreaInsets();
  const topPadding = getTabScreenTopPadding(insets.top);
  const navigation = useNavigation();
  const tabBarContentInset = useTabBarContentInset();
  const photoAccess = usePhotoAccess();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [timelineRefreshNonce, setTimelineRefreshNonce] = useState(0);
  const isPipelineActive =
    photoAccess.isScanning ||
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages;
  const wasPipelineActiveRef = useRef(isPipelineActive);
  const timelineRefreshKey =
    navigation.captureCompletedNonce + timelineRefreshNonce;
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

  const handleToggleFavorite = useCallback(
    async (localEventId: string, isFavorite: boolean) => {
      const updated = await toggleMomentFavorite(localEventId, isFavorite);
      if (updated) {
        setTimelineRefreshNonce((value) => value + 1);
      }
    },
    [],
  );

  // TODO: delete-moment — remove from local DB, refresh timeline, and sync deletion when account is linked.
  const handleDeleteMoment = useCallback(() => {
    Alert.alert(
      t('timeline.moment.deleteSoonTitle'),
      t('timeline.moment.deleteSoonMessage'),
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
        onShare={handleShareMoment}
        onToggleFavorite={handleToggleFavorite}
      />
    ),
    [
      handleDeleteMoment,
      handleShareMoment,
      handleToggleFavorite,
      locale,
      openMomentDetail,
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
        favoritesOnly={favoritesOnly}
        hasPhotoAccess={hasPhotoAccess}
        isPipelineActive={isPipelineActive}
        onRedetectPets={photoAccess.redetectPets}
        onRequestAccess={photoAccess.requestAccess}
        onStartScan={photoAccess.startScan}
        onToggleFavoritesOnly={() => setFavoritesOnly((value) => !value)}
        photoAccess={photoAccess}
        timelineEventCount={timeline.events.length}
        timelineIsLoading={timeline.isLoading}
        syncHasPendingMemories={syncStatus.hasPendingMemories}
        syncIsActive={syncStatus.isSyncing}
      />
    ),
    [
      favoritesOnly,
      hasPhotoAccess,
      isPipelineActive,
      locale,
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
    </View>
  );
}

type TimelineHeaderProps = {
  topPadding: number;
  canAskAgain: boolean;
  errorMessage: string | null;
  favoritesOnly: boolean;
  hasPhotoAccess: boolean;
  isPipelineActive: boolean;
  onRedetectPets: () => Promise<void>;
  onRequestAccess: () => Promise<void>;
  onStartScan: () => Promise<void>;
  onToggleFavoritesOnly: () => void;
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
  favoritesOnly,
  hasPhotoAccess,
  isPipelineActive,
  onRedetectPets,
  onRequestAccess,
  onStartScan,
  onToggleFavoritesOnly,
  photoAccess,
  timelineEventCount,
  timelineIsLoading,
  syncHasPendingMemories,
  syncIsActive,
}: TimelineHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop: topPadding }]}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.title}>{t('common.appName')}</Text>
          <Text style={styles.subtitle}>{t('home.momentsSubtitle')}</Text>
        </View>
        {hasPhotoAccess && !isPipelineActive ? (
          <View style={styles.headerActions}>
            <SecondaryButton
              label={t('home.redetectPets')}
              onPress={onRedetectPets}
            />
            <SecondaryButton
              label={t('home.lookAgain')}
              onPress={onStartScan}
            />
          </View>
        ) : null}
      </View>

      <SaveMemoriesLink />

      <SyncStatusIndicator
        hasPendingMemories={syncHasPendingMemories}
        isSyncing={syncIsActive}
      />

      <View style={styles.filterRow}>
        <Pressable
          accessibilityRole="button"
          style={[
            styles.filterChip,
            favoritesOnly && styles.filterChipSelected,
          ]}
          onPress={onToggleFavoritesOnly}
        >
          <Text
            style={[
              styles.filterChipText,
              favoritesOnly && styles.filterChipTextSelected,
            ]}
          >
            {favoritesOnly
              ? t('home.favoritesFilter')
              : t('home.allMomentsFilter')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.statusBand}>
        <Text style={styles.statusLabel}>
          {getPhotoPermissionStatusLabel(photoAccess.permissionStatus)}
        </Text>
        <Text style={styles.statusTitle}>
          {getHomeStatusTitle({
            favoritesOnly,
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
    </View>
  );
}

function PipelineProgress({
  photoAccess,
}: {
  photoAccess: ReturnType<typeof usePhotoAccess>;
}) {
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
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: ButtonProps) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
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

const styles = StyleSheet.create({
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
  headerTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerActions: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    maxWidth: '52%',
  },
  filterRow: {
    marginTop: spacing.sm,
  },
  filterChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  filterChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: colors.surface,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 17,
    lineHeight: 24,
    color: colors.textMuted,
  },
  statusBand: {
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.timelineDivider,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
  },
  statusLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusTitle: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 25,
  },
  statusText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  progressBlock: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  progressValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  progressHint: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },
  progressSubhint: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    marginTop: spacing.md,
    color: '#8A3A2B',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
    paddingHorizontal: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
