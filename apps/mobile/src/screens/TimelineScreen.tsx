import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { useEventUpdatesPoll } from '@/modules/sync';
import { CaptureFab } from '@/modules/timeline/components/CaptureFab';
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
      paddingTop: spacing.sm,
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
  const listRef = useRef<FlatList<TimelineEvent>>(null);
  const [timelineScrollY, setTimelineScrollY] = useState(0);
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
  useEventUpdatesPoll({
    enabled: true,
    onApplied: handleRemoteEventUpdatesApplied,
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

  const listHeader = useMemo(() => <TimelineHeader />, []);

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
        data={timeline.events}
        extraData={`${locale}:${timelineRefreshKey}:${timeline.events.length}`}
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

function TimelineHeader() {
  const styles = useThemedStyles(createTimelineScreenStyles);

  return (
    <View style={styles.header}>
      <SaveMemoriesLink />
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
