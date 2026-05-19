import { useCallback, useEffect, useMemo, useState } from 'react';

import { getDatabase } from '@/db';
import { t } from '@/i18n';
import { formatDbError, logDbInfo } from '@/db/dbLogger';
import { redetectLocalPetPipeline } from '@/modules/eventBuilder/redetectPipeline';
import type { BestImageSelectionProgress } from '@/modules/eventBuilder/bestImageSelection';
import type { EventClusteringProgress } from '@/modules/eventBuilder/eventClustering';
import type { PetDetectionProgress } from '@/modules/eventBuilder/petDetection';

import {
  canScanPhotos,
  type PhotoPermissionResult,
  type PhotoPermissionStatus,
} from './permissions';
import {
  getPipelineResumePlan,
  hasIncompletePipelineWork,
  shouldStartInitialScan,
} from './pipelineResume';
import { resumeLocalPipeline, runLocalPipeline } from './runLocalPipeline';
import {
  checkPhotoLibraryPermission,
  requestPhotoLibraryPermission,
  type ScanProgress,
} from './scanner';

export type PhotoAccessState = {
  permissionStatus: PhotoPermissionStatus;
  canAskAgain: boolean;
  isScanning: boolean;
  isDetectingPets: boolean;
  isClusteringEvents: boolean;
  isSelectingImages: boolean;
  /** True after the first scan + processing pass finishes (success or failure). */
  initialScanCompleted: boolean;
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

export type UsePhotoAccessOptions = {
  /** When false, only checks permission on mount — no background scan until startScan/resume. */
  autoResumeOnMount?: boolean;
};

export function usePhotoAccess(
  options: UsePhotoAccessOptions = {},
): PhotoAccessState & {
  requestAccess: () => Promise<void>;
  startScan: () => Promise<void>;
  redetectPets: () => Promise<void>;
} {
  const { autoResumeOnMount = true } = options;
  const [state, setState] = useState<PhotoAccessState>({
    permissionStatus: 'checking',
    canAskAgain: true,
    isScanning: false,
    isDetectingPets: false,
    isClusteringEvents: false,
    isSelectingImages: false,
    initialScanCompleted: false,
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

  const finishPipelineRun = useCallback(() => {
    setState((current) => ({
      ...current,
      isScanning: false,
      isDetectingPets: false,
      isClusteringEvents: false,
      isSelectingImages: false,
      initialScanCompleted: true,
    }));
  }, []);

  const pipelineProgress = useMemo(
    () => ({
      onScanProgress: (progress: ScanProgress) => {
        setState((current) => ({
          ...current,
          isScanning: true,
          isDetectingPets: false,
          isClusteringEvents: false,
          isSelectingImages: false,
          progress,
        }));
      },
      onDetectingProgress: (petDetectionProgress: PetDetectionProgress) => {
        setState((current) => ({
          ...current,
          isScanning: false,
          isDetectingPets: true,
          isClusteringEvents: false,
          isSelectingImages: false,
          petDetectionProgress,
        }));
      },
      onClusteringProgress: (
        eventClusteringProgress: EventClusteringProgress,
      ) => {
        setState((current) => ({
          ...current,
          isScanning: false,
          isDetectingPets: false,
          isClusteringEvents: true,
          isSelectingImages: false,
          eventClusteringProgress,
        }));
      },
      onSelectingProgress: (
        bestImageSelectionProgress: BestImageSelectionProgress,
      ) => {
        setState((current) => ({
          ...current,
          isScanning: false,
          isDetectingPets: false,
          isClusteringEvents: false,
          isSelectingImages: true,
          bestImageSelectionProgress,
        }));
      },
    }),
    [],
  );

  const runPipeline = useCallback(
    async (
      runner: (
        database: Awaited<ReturnType<typeof getDatabase>>,
      ) => Promise<void>,
    ) => {
      setState((current) => ({
        ...current,
        errorMessage: null,
        initialScanCompleted: false,
      }));

      try {
        const database = await getDatabase();
        await runner(database);
        finishPipelineRun();
      } catch (error) {
        logDbInfo('Pipeline failed', { error: formatDbError(error) });
        setState((current) => ({
          ...current,
          isScanning: false,
          isDetectingPets: false,
          isClusteringEvents: false,
          isSelectingImages: false,
          initialScanCompleted: true,
          errorMessage:
            error instanceof Error
              ? error.message
              : t('errors.couldNotScanMoments'),
        }));
      }
    },
    [finishPipelineRun],
  );

  const startScan = useCallback(async () => {
    await runPipeline(async (database) => {
      await runLocalPipeline({
        database,
        includeRecentScan: true,
        includeOlderScan: true,
        progress: pipelineProgress,
      });
    });
  }, [pipelineProgress, runPipeline]);

  const resumeIfNeeded = useCallback(async () => {
    await runPipeline(async (database) => {
      const plan = await getPipelineResumePlan(database);

      if (hasIncompletePipelineWork(plan)) {
        await resumeLocalPipeline({
          database,
          plan,
          progress: pipelineProgress,
        });
        return;
      }

      if (shouldStartInitialScan(plan)) {
        await runLocalPipeline({
          database,
          includeRecentScan: true,
          includeOlderScan: true,
          progress: pipelineProgress,
        });
      }
    });
  }, [pipelineProgress, runPipeline]);

  const redetectPets = useCallback(async () => {
    await runPipeline(async (database) => {
      await redetectLocalPetPipeline({
        database,
        onDetectingProgress: pipelineProgress.onDetectingProgress,
      });
      await runLocalPipeline({
        database,
        progress: pipelineProgress,
      });
    });
  }, [pipelineProgress, runPipeline]);

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

        if (autoResumeOnMount && canScanPhotos(permission.status)) {
          await resumeIfNeeded();
        }
      } catch (error) {
        if (isMounted) {
          setState((current) => ({
            ...current,
            permissionStatus: 'denied',
            errorMessage:
              error instanceof Error
                ? error.message
                : t('errors.couldNotCheckPhotoAccess'),
          }));
        }
      }
    }

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [applyPermission, autoResumeOnMount, resumeIfNeeded]);

  return {
    ...state,
    requestAccess,
    startScan,
    redetectPets,
  };
}
