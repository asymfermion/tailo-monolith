import { useCallback, useEffect, useState } from 'react';

import { getDatabase } from '@/db';
import {
  redetectLocalPetPipeline,
  selectBestEventImages,
  type BestImageSelectionProgress,
  clusterLocalPetEvents,
  type EventClusteringProgress,
  processPendingPetCandidates,
  type PetDetectionProgress,
} from '@/modules/eventBuilder';

import {
  canScanPhotos,
  type PhotoPermissionResult,
  type PhotoPermissionStatus,
} from './permissions';
import {
  checkPhotoLibraryPermission,
  requestPhotoLibraryPermission,
  scanOlderPhotos,
  scanRecentPhotos,
  type ScanProgress,
} from './scanner';

export type PhotoAccessState = {
  permissionStatus: PhotoPermissionStatus;
  canAskAgain: boolean;
  isScanning: boolean;
  isDetectingPets: boolean;
  isClusteringEvents: boolean;
  isSelectingImages: boolean;
  progress: ScanProgress;
  petDetectionProgress: PetDetectionProgress;
  eventClusteringProgress: EventClusteringProgress;
  bestImageSelectionProgress: BestImageSelectionProgress;
  errorMessage: string | null;
};

const initialProgress: ScanProgress = {
  batchCount: 0,
  scannedCount: 0,
  persistedCount: 0,
  hasNextPage: false,
};

const initialPetDetectionProgress: PetDetectionProgress = {
  batchCount: 0,
  processedCount: 0,
  totalCount: 0,
  petCandidateCount: 0,
  hasMore: false,
};

const initialEventClusteringProgress: EventClusteringProgress = {
  petCandidateCount: 0,
  eventCandidateCount: 0,
  persistedCount: 0,
};

const initialBestImageSelectionProgress: BestImageSelectionProgress = {
  eventCount: 0,
  scoredAssetCount: 0,
  selectedAssetCount: 0,
};

export function usePhotoAccess(): PhotoAccessState & {
  requestAccess: () => Promise<void>;
  startScan: () => Promise<void>;
  redetectPets: () => Promise<void>;
} {
  const [state, setState] = useState<PhotoAccessState>({
    permissionStatus: 'checking',
    canAskAgain: true,
    isScanning: false,
    isDetectingPets: false,
    isClusteringEvents: false,
    isSelectingImages: false,
    progress: initialProgress,
    petDetectionProgress: initialPetDetectionProgress,
    eventClusteringProgress: initialEventClusteringProgress,
    bestImageSelectionProgress: initialBestImageSelectionProgress,
    errorMessage: null,
  });

  const applyPermission = useCallback((permission: PhotoPermissionResult) => {
    setState((current) => ({
      ...current,
      permissionStatus: permission.status,
      canAskAgain: permission.canAskAgain,
      errorMessage: null,
    }));
  }, []);

  const startScan = useCallback(async () => {
    setState((current) => ({
      ...current,
      isScanning: true,
      isDetectingPets: false,
      isClusteringEvents: false,
      isSelectingImages: false,
      errorMessage: null,
      progress: initialProgress,
      petDetectionProgress: initialPetDetectionProgress,
      eventClusteringProgress: initialEventClusteringProgress,
      bestImageSelectionProgress: initialBestImageSelectionProgress,
    }));

    try {
      const database = await getDatabase();
      await scanRecentPhotos({
        database,
        onProgress: (progress) => {
          setState((current) => ({
            ...current,
            progress,
          }));
        },
      });
      setState((current) => ({
        ...current,
        isScanning: false,
        isDetectingPets: true,
      }));
      await processPendingPetCandidates({
        database,
        onProgress: (petDetectionProgress) => {
          setState((current) => ({
            ...current,
            petDetectionProgress,
          }));
        },
      });
      setState((current) => ({
        ...current,
        isDetectingPets: false,
        isClusteringEvents: true,
      }));
      await clusterLocalPetEvents({
        database,
        onProgress: (eventClusteringProgress) => {
          setState((current) => ({
            ...current,
            eventClusteringProgress,
          }));
        },
      });
      setState((current) => ({
        ...current,
        isClusteringEvents: false,
        isSelectingImages: true,
      }));
      await selectBestEventImages({
        database,
        onProgress: (bestImageSelectionProgress) => {
          setState((current) => ({
            ...current,
            bestImageSelectionProgress,
          }));
        },
      });
      setState((current) => ({
        ...current,
        isSelectingImages: false,
      }));
      void continueOlderPhotoPipeline(database).catch(() => undefined);
    } catch (error) {
      setState((current) => ({
        ...current,
        isScanning: false,
        isDetectingPets: false,
        isClusteringEvents: false,
        isSelectingImages: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Could not look through your pet moments yet.',
      }));
    }
  }, []);

  const redetectPets = useCallback(async () => {
    setState((current) => ({
      ...current,
      isScanning: false,
      isDetectingPets: true,
      isClusteringEvents: false,
      isSelectingImages: false,
      errorMessage: null,
      petDetectionProgress: initialPetDetectionProgress,
      eventClusteringProgress: initialEventClusteringProgress,
      bestImageSelectionProgress: initialBestImageSelectionProgress,
    }));

    try {
      const database = await getDatabase();
      await redetectLocalPetPipeline({
        database,
        onDetectingProgress: (petDetectionProgress) => {
          setState((current) => ({
            ...current,
            petDetectionProgress,
          }));
        },
      });
      setState((current) => ({
        ...current,
        isDetectingPets: false,
        isClusteringEvents: true,
      }));
      await clusterLocalPetEvents({
        database,
        onProgress: (eventClusteringProgress) => {
          setState((current) => ({
            ...current,
            eventClusteringProgress,
          }));
        },
      });
      setState((current) => ({
        ...current,
        isClusteringEvents: false,
        isSelectingImages: true,
      }));
      await selectBestEventImages({
        database,
        onProgress: (bestImageSelectionProgress) => {
          setState((current) => ({
            ...current,
            bestImageSelectionProgress,
          }));
        },
      });
      setState((current) => ({
        ...current,
        isSelectingImages: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isDetectingPets: false,
        isClusteringEvents: false,
        isSelectingImages: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Could not redetect pet moments yet.',
      }));
    }
  }, []);

  const requestAccess = useCallback(async () => {
    const permission = await requestPhotoLibraryPermission();
    applyPermission(permission);

    if (canScanPhotos(permission.status)) {
      await startScan();
    }
  }, [applyPermission, startScan]);

  useEffect(() => {
    let isMounted = true;

    async function checkPermission() {
      try {
        const permission = await checkPhotoLibraryPermission();

        if (!isMounted) {
          return;
        }

        applyPermission(permission);

        if (canScanPhotos(permission.status)) {
          await startScan();
        }
      } catch (error) {
        if (isMounted) {
          setState((current) => ({
            ...current,
            permissionStatus: 'denied',
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Could not check photo access.',
          }));
        }
      }
    }

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [applyPermission, startScan]);

  return {
    ...state,
    requestAccess,
    startScan,
    redetectPets,
  };
}

async function continueOlderPhotoPipeline(
  database: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await scanOlderPhotos({ database });
  await processPendingPetCandidates({ database });
  await clusterLocalPetEvents({ database });
  await selectBestEventImages({ database });
}
