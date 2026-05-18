import { formatCount, t } from '../t';

type PermissionStatus =
  | 'full'
  | 'limited'
  | 'denied'
  | 'unavailable'
  | 'checking'
  | 'undetermined'
  | string;

export function getPhotoPermissionStatusLabel(
  permissionStatus: PermissionStatus,
): string {
  switch (permissionStatus) {
    case 'full':
      return t('home.statusPhotoAccessOn');
    case 'limited':
      return t('home.statusSelectedPhotos');
    case 'denied':
      return t('home.statusPhotoAccessOff');
    case 'unavailable':
      return t('home.statusPhotosUnavailable');
    case 'checking':
      return t('home.statusGettingReady');
    default:
      return t('home.statusStartHere');
  }
}

type StatusTitleOptions = {
  favoritesOnly: boolean;
  permissionStatus: PermissionStatus;
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

export function getHomeStatusTitle(options: StatusTitleOptions): string {
  if (options.isScanning) {
    return t('home.statusFindingMoments');
  }

  if (options.isDetectingPets) {
    return t('home.statusLookingForPets');
  }

  if (options.isClusteringEvents) {
    return t('home.statusBuildingTimeline');
  }

  if (options.isSelectingImages) {
    return t('home.statusChoosingPhotos');
  }

  if (
    options.favoritesOnly &&
    options.timelineEventCount === 0 &&
    !options.timelineIsLoading
  ) {
    return t('home.statusNoFavorites');
  }

  if (options.timelineEventCount > 0) {
    return options.favoritesOnly
      ? t('home.statusFavoriteCount', {
          count: formatCount(options.timelineEventCount),
        })
      : t('home.statusTimelineCount', {
          count: formatCount(options.timelineEventCount),
        });
  }

  if (options.timelineIsLoading) {
    return t('home.statusLoadingMoments');
  }

  if (options.selectedAssetCount > 0) {
    return t('home.statusPhotosSelected', {
      count: formatCount(options.selectedAssetCount),
    });
  }

  if (options.eventCandidateCount > 0) {
    return t('home.statusMomentsPrepared', {
      count: formatCount(options.eventCandidateCount),
    });
  }

  if (options.processedCount > 0 && options.petCandidateCount === 0) {
    return t('home.statusReadyForMore');
  }

  if (options.petCandidateCount > 0) {
    return t('home.statusPossiblePetMoments', {
      count: formatCount(options.petCandidateCount),
    });
  }

  if (options.scannedCount > 0) {
    return t('home.statusPhotosSavedLocally');
  }

  switch (options.permissionStatus) {
    case 'full':
    case 'limited':
      return t('home.statusReadyToBuild');
    case 'denied':
      return t('home.statusNoProblem');
    case 'unavailable':
      return t('home.statusPhotosNotAvailable');
    case 'checking':
      return t('home.statusPreparingAccess');
    default:
      return t('home.statusLetTailoLook');
  }
}

export function getPhotoPermissionStatusMessage(
  permissionStatus: PermissionStatus,
  canAskAgain: boolean,
): string {
  switch (permissionStatus) {
    case 'full':
      return t('home.messageFullAccess');
    case 'limited':
      return t('home.messageLimitedAccess');
    case 'denied':
      return canAskAgain
        ? t('home.messageDeniedCanAsk')
        : t('home.messageDeniedNoAsk');
    case 'unavailable':
      return t('home.messageUnavailable');
    case 'checking':
      return t('home.messageChecking');
    default:
      return t('home.messageUndetermined');
  }
}

type TimelineEmptyStateOptions = {
  favoritesOnly: boolean;
  hasPhotoAccess: boolean;
  isLoading: boolean;
  isPipelineActive: boolean;
  permissionStatus: PermissionStatus;
  petCandidateCount: number;
  processedCount: number;
};

export function getTimelineEmptyTitle(
  options: TimelineEmptyStateOptions,
): string {
  if (options.isLoading || options.isPipelineActive) {
    return t('home.emptyBuilding');
  }

  if (options.favoritesOnly) {
    return t('home.emptyNoFavorites');
  }

  if (options.permissionStatus === 'denied') {
    return t('home.emptyNoPhotoAccess');
  }

  if (options.processedCount > 0 && options.petCandidateCount === 0) {
    return t('home.emptyNoPetMoments');
  }

  return t('home.emptyNoMoments');
}

export function getTimelineEmptyMessage(
  options: TimelineEmptyStateOptions,
): string {
  if (options.isLoading || options.isPipelineActive) {
    return t('home.emptyBuildingMessage');
  }

  if (options.favoritesOnly) {
    return t('home.emptyFavoriteHint');
  }

  if (options.permissionStatus === 'denied') {
    return t('home.emptyDeniedHint');
  }

  if (options.processedCount > 0 && options.petCandidateCount === 0) {
    return t('home.emptyNoPetMomentsHint');
  }

  if (!options.hasPhotoAccess) {
    return t('home.emptyChoosePhotos');
  }

  return t('home.emptyDefault');
}
