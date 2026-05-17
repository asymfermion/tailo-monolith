import { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';

import { colors, spacing } from '@/constants/theme';
import { usePhotoAccess } from '@/modules/mediaScanner';
import { useTimelineEvents } from '@/modules/timeline';
import type { TimelineEvent, TimelineEventMedia } from '@/types';

export function HomeScreen() {
  const photoAccess = usePhotoAccess();
  const refreshKey =
    photoAccess.bestImageSelectionProgress.selectedAssetCount +
    photoAccess.eventClusteringProgress.eventCandidateCount;
  const timeline = useTimelineEvents(refreshKey);
  const isPipelineActive =
    photoAccess.isScanning ||
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages;
  const hasPhotoAccess =
    photoAccess.permissionStatus === 'full' ||
    photoAccess.permissionStatus === 'limited';
  const renderItem: ListRenderItem<TimelineEvent> = ({ item }) => (
    <TimelineMoment event={item} />
  );
  const listHeader = useMemo(
    () => (
      <TimelineHeader
        canAskAgain={photoAccess.canAskAgain}
        errorMessage={photoAccess.errorMessage ?? timeline.errorMessage}
        hasPhotoAccess={hasPhotoAccess}
        isPipelineActive={isPipelineActive}
        onRequestAccess={photoAccess.requestAccess}
        onRedetectPets={photoAccess.redetectPets}
        onStartScan={photoAccess.startScan}
        photoAccess={photoAccess}
        timelineEventCount={timeline.events.length}
        timelineIsLoading={timeline.isLoading}
      />
    ),
    [hasPhotoAccess, isPipelineActive, photoAccess, timeline],
  );

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={timeline.events}
      keyExtractor={(item) => item.localEventId}
      ListEmptyComponent={
        <TimelineEmptyState
          hasPhotoAccess={hasPhotoAccess}
          isPipelineActive={isPipelineActive}
          isLoading={timeline.isLoading}
          permissionStatus={photoAccess.permissionStatus}
          petCandidateCount={photoAccess.petDetectionProgress.petCandidateCount}
          processedCount={photoAccess.petDetectionProgress.processedCount}
        />
      }
      ListHeaderComponent={listHeader}
      renderItem={renderItem}
      refreshing={timeline.isLoading && !isPipelineActive}
      onRefresh={timeline.refresh}
    />
  );
}

type TimelineHeaderProps = {
  canAskAgain: boolean;
  errorMessage: string | null;
  hasPhotoAccess: boolean;
  isPipelineActive: boolean;
  onRedetectPets: () => Promise<void>;
  onRequestAccess: () => Promise<void>;
  onStartScan: () => Promise<void>;
  photoAccess: ReturnType<typeof usePhotoAccess>;
  timelineEventCount: number;
  timelineIsLoading: boolean;
};

function TimelineHeader({
  canAskAgain,
  errorMessage,
  hasPhotoAccess,
  isPipelineActive,
  onRedetectPets,
  onRequestAccess,
  onStartScan,
  photoAccess,
  timelineEventCount,
  timelineIsLoading,
}: TimelineHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTitleRow}>
        <View>
          <Text style={styles.title}>Tailo</Text>
          <Text style={styles.subtitle}>Moments</Text>
        </View>
        {hasPhotoAccess && !isPipelineActive ? (
          <View style={styles.headerActions}>
            <SecondaryButton label="Redetect pets" onPress={onRedetectPets} />
            <SecondaryButton label="Look Again" onPress={onStartScan} />
          </View>
        ) : null}
      </View>

      <View style={styles.statusBand}>
        <Text style={styles.statusLabel}>
          {getStatusLabel(photoAccess.permissionStatus)}
        </Text>
        <Text style={styles.statusTitle}>
          {getStatusTitle({
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
          {getStatusMessage(photoAccess.permissionStatus, canAskAgain)}
        </Text>

        {photoAccess.permissionStatus === 'undetermined' ? (
          <PrimaryButton label="Choose Photos" onPress={onRequestAccess} />
        ) : null}

        {photoAccess.permissionStatus === 'denied' && canAskAgain ? (
          <PrimaryButton label="Choose Photos" onPress={onRequestAccess} />
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
        label={`${photoAccess.progress.scannedCount.toLocaleString()} recent photos checked`}
        value={`Batch ${Math.max(photoAccess.progress.batchCount, 1)}`}
      />
    );
  }

  if (photoAccess.isDetectingPets) {
    const { processedCount, totalCount, petCandidateCount } =
      photoAccess.petDetectionProgress;
    const progressValue =
      totalCount > 0
        ? `${processedCount.toLocaleString()} of ${totalCount.toLocaleString()} photos`
        : `${processedCount.toLocaleString()} photos checked`;
    const candidateHint =
      petCandidateCount > 0
        ? `${petCandidateCount.toLocaleString()} possible pet moments so far`
        : 'This can take a minute on large libraries';

    return (
      <ProgressLine
        label="Finding pet moments..."
        value={progressValue}
        hint={candidateHint}
      />
    );
  }

  if (photoAccess.isClusteringEvents) {
    return (
      <ProgressLine
        label="Building your timeline..."
        value={`${photoAccess.eventClusteringProgress.eventCandidateCount.toLocaleString()} moments prepared`}
      />
    );
  }

  if (photoAccess.isSelectingImages) {
    return (
      <ProgressLine
        label="Choosing the best photos..."
        value={`${photoAccess.bestImageSelectionProgress.selectedAssetCount.toLocaleString()} photos selected`}
      />
    );
  }

  return null;
}

function TimelineMoment({ event }: { event: TimelineEvent }) {
  const primaryMedia =
    event.media.find((media) => media.isPrimary) ?? event.media[0];
  const secondaryMedia = event.media
    .filter((media) => media.localAssetId !== primaryMedia?.localAssetId)
    .slice(0, 4);

  return (
    <View style={styles.moment}>
      <View style={styles.momentMetaRow}>
        <Text style={styles.momentType}>
          {formatEventType(event.eventType)}
        </Text>
        <Text style={styles.momentTime}>
          {formatTimestamp(event.timestamp)}
        </Text>
      </View>
      <Text style={styles.caption}>
        {event.caption ?? 'A small moment from today.'}
      </Text>

      {primaryMedia ? (
        <View style={styles.mediaGrid}>
          <Image
            accessibilityLabel="Primary moment photo"
            contentFit="cover"
            source={{ uri: primaryMedia.uri }}
            style={styles.primaryImage}
          />
          {secondaryMedia.length > 0 ? (
            <View style={styles.secondaryGrid}>
              {secondaryMedia.map((media) => (
                <MomentImage key={media.localAssetId} media={media} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function MomentImage({ media }: { media: TimelineEventMedia }) {
  return (
    <Image
      accessibilityLabel="Moment photo"
      contentFit="cover"
      source={{ uri: media.uri }}
      style={styles.secondaryImage}
    />
  );
}

type TimelineEmptyStateProps = {
  hasPhotoAccess: boolean;
  isLoading: boolean;
  isPipelineActive: boolean;
  permissionStatus: string;
  petCandidateCount: number;
  processedCount: number;
};

function TimelineEmptyState({
  hasPhotoAccess,
  isLoading,
  isPipelineActive,
  permissionStatus,
  petCandidateCount,
  processedCount,
}: TimelineEmptyStateProps) {
  const title = getEmptyTitle({
    hasPhotoAccess,
    isLoading,
    isPipelineActive,
    permissionStatus,
    petCandidateCount,
    processedCount,
  });
  const message = getEmptyMessage({
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

function getStatusLabel(permissionStatus: string): string {
  switch (permissionStatus) {
    case 'full':
      return 'Photo access on';
    case 'limited':
      return 'Selected photos';
    case 'denied':
      return 'Photo access off';
    case 'unavailable':
      return 'Photos unavailable';
    case 'checking':
      return 'Getting ready';
    default:
      return 'Start here';
  }
}

type StatusTitleOptions = {
  permissionStatus: string;
  isScanning: boolean;
  isDetectingPets: boolean;
  isClusteringEvents: boolean;
  isSelectingImages: boolean;
  scannedCount: number;
  processedCount: number;
  petCandidateCount: number;
  eventCandidateCount: number;
  selectedAssetCount: number;
  timelineEventCount: number;
  timelineIsLoading: boolean;
};

function getStatusTitle({
  permissionStatus,
  isScanning,
  isDetectingPets,
  isClusteringEvents,
  isSelectingImages,
  scannedCount,
  processedCount,
  petCandidateCount,
  eventCandidateCount,
  selectedAssetCount,
  timelineEventCount,
  timelineIsLoading,
}: StatusTitleOptions): string {
  if (isScanning) {
    return 'Finding moments...';
  }

  if (isDetectingPets) {
    return 'Looking for pet moments';
  }

  if (isClusteringEvents) {
    return 'Building your timeline';
  }

  if (isSelectingImages) {
    return 'Choosing the best photos';
  }

  if (timelineEventCount > 0) {
    return `${timelineEventCount.toLocaleString()} timeline moments`;
  }

  if (timelineIsLoading) {
    return 'Loading moments...';
  }

  if (selectedAssetCount > 0) {
    return `${selectedAssetCount.toLocaleString()} photos selected`;
  }

  if (eventCandidateCount > 0) {
    return `${eventCandidateCount.toLocaleString()} moments prepared`;
  }

  if (processedCount > 0 && petCandidateCount === 0) {
    return 'Ready when more moments appear';
  }

  if (petCandidateCount > 0) {
    return `${petCandidateCount.toLocaleString()} possible pet moments`;
  }

  if (scannedCount > 0) {
    return 'Recent photos are saved locally';
  }

  switch (permissionStatus) {
    case 'full':
    case 'limited':
      return 'Ready to build your timeline';
    case 'denied':
      return 'No problem';
    case 'unavailable':
      return 'Photos are not available here';
    case 'checking':
      return 'Preparing photo access';
    default:
      return 'Let Tailo look for pet moments';
  }
}

function getStatusMessage(
  permissionStatus: string,
  canAskAgain: boolean,
): string {
  switch (permissionStatus) {
    case 'full':
      return 'Tailo checks recent photos on this device only.';
    case 'limited':
      return 'Tailo will use only the photos you selected.';
    case 'denied':
      return canAskAgain
        ? 'Choose photos when you are ready, or continue without them.'
        : 'You can turn photo access on later in Settings.';
    case 'unavailable':
      return 'This device does not expose a photo library right now.';
    case 'checking':
      return 'One quiet second while we check what is available.';
    default:
      return 'Pick the photos Tailo can use. Your timeline starts on this device.';
  }
}

function getEmptyTitle({
  isLoading,
  isPipelineActive,
  permissionStatus,
  petCandidateCount,
  processedCount,
}: TimelineEmptyStateProps): string {
  if (isLoading || isPipelineActive) {
    return 'Building your timeline...';
  }

  if (permissionStatus === 'denied') {
    return 'No photo access';
  }

  if (processedCount > 0 && petCandidateCount === 0) {
    return 'No pet moments found yet';
  }

  return 'No moments yet';
}

function getEmptyMessage({
  hasPhotoAccess,
  isLoading,
  isPipelineActive,
  permissionStatus,
  petCandidateCount,
  processedCount,
}: TimelineEmptyStateProps): string {
  if (isLoading || isPipelineActive) {
    return 'Moments will appear here as soon as they are ready.';
  }

  if (permissionStatus === 'denied') {
    return 'You can still add moments with the camera when capture is ready.';
  }

  if (processedCount > 0 && petCandidateCount === 0) {
    return 'Try again later when there are more recent photos.';
  }

  if (!hasPhotoAccess) {
    return 'Choose photos to begin.';
  }

  return 'Tailo will keep looking quietly.';
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatEventType(eventType: TimelineEvent['eventType']): string {
  switch (eventType) {
    case 'walk':
      return 'Walk';
    case 'play':
      return 'Play';
    case 'rest':
      return 'Rest';
    case 'eating':
      return 'Meal';
    default:
      return 'Moment';
  }
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
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
    borderBottomColor: colors.border,
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
  moment: {
    marginTop: spacing.xl,
  },
  momentMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  momentType: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  momentTime: {
    color: colors.textMuted,
    fontSize: 13,
  },
  caption: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 27,
  },
  mediaGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  primaryImage: {
    aspectRatio: 1.16,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryImage: {
    aspectRatio: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: colors.border,
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
