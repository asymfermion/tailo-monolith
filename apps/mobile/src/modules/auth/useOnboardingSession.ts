import { useCallback, useEffect, useRef, useState } from 'react';

import { logAuth } from './authLogger';
import {
  ensureOnboardingCloudIdentity,
  schedulePostOnboardingCloudSync,
} from './onboardingCloudSetup';
import { ensureRemoteAuthSession, isRemoteAuthConfigured } from './authService';
import { resolveOnboardingIdentityId } from './onboardingIdentity';
import { isLinkedRemoteAccount } from './authTypes';
import { subscribeAuthSessionChanged } from './authSessionEvents';
import { loadResolvedOnboardingState } from './resolveOnboardingAfterLoad';
import {
  initialOnboardingState,
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
  type OnboardingCompletedFlags,
  type OnboardingState,
  type OnboardingStatePatch,
  type OnboardingStep,
} from './onboardingState';

function onboardingStatesEqual(
  left: OnboardingState,
  right: OnboardingState,
): boolean {
  return (
    left.completed === right.completed &&
    left.step === right.step &&
    left.completionSource === right.completionSource &&
    left.completedFlags.identityCreated ===
      right.completedFlags.identityCreated &&
    left.completedFlags.scanStarted === right.completedFlags.scanStarted &&
    left.completedFlags.timelinePreviewSeen ===
      right.completedFlags.timelinePreviewSeen
  );
}

export type OnboardingSessionState = {
  anonymousUserId: string | null;
  onboardingState: OnboardingState;
  isLoading: boolean;
  errorMessage: string | null;
  reload: (options?: { silent?: boolean; reason?: string }) => Promise<void>;
  updateOnboardingState: (patch: OnboardingStatePatch) => Promise<void>;
  setOnboardingStep: (
    step: OnboardingStep,
    completedFlags?: Partial<OnboardingCompletedFlags>,
  ) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

export function useOnboardingSession(): OnboardingSessionState {
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(
    initialOnboardingState,
  );
  const onboardingStateRef = useRef(onboardingState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reload = useCallback(
    async (options?: { silent?: boolean; reason?: string }) => {
      const silent = options?.silent ?? onboardingStateRef.current.completed;
      const reason = options?.reason ?? 'manual';

      logAuth('Onboarding session reload started', {
        reason,
        silent,
        completed: onboardingStateRef.current.completed,
      });

      if (!silent) {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const session = isRemoteAuthConfigured()
          ? await ensureRemoteAuthSession()
          : null;
        const nextAnonymousUserId = await resolveOnboardingIdentityId(session);
        const storedOnboardingState = await loadOnboardingState();
        const resolvedOnboardingState = await loadResolvedOnboardingState(
          mergeOnboardingState(storedOnboardingState, {
            completedFlags: { identityCreated: true },
          }),
        );
        await saveOnboardingState(resolvedOnboardingState);

        setAnonymousUserId((current) =>
          current === nextAnonymousUserId ? current : nextAnonymousUserId,
        );
        setOnboardingState((current) => {
          if (onboardingStatesEqual(current, resolvedOnboardingState)) {
            return current;
          }

          onboardingStateRef.current = resolvedOnboardingState;
          return resolvedOnboardingState;
        });

        logAuth('Onboarding session reload finished', {
          reason,
          silent,
          completed: resolvedOnboardingState.completed,
          userId: nextAnonymousUserId,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not prepare first session.';
        logAuth('Onboarding session reload failed', { reason, message });
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void reload({ reason: 'initial_mount' });
  }, [reload]);

  useEffect(
    () =>
      subscribeAuthSessionChanged(() => {
        void (async () => {
          let silent = onboardingStateRef.current.completed;

          if (!silent && isRemoteAuthConfigured()) {
            const session = await ensureRemoteAuthSession();
            silent = isLinkedRemoteAccount(session);
          }

          await reload({
            silent,
            reason: 'auth_session_changed',
          });
        })();
      }),
    [reload],
  );

  const updateOnboardingState = useCallback(
    async (patch: OnboardingStatePatch) => {
      const nextState = mergeOnboardingState(onboardingStateRef.current, patch);
      onboardingStateRef.current = nextState;
      setOnboardingState(nextState);
      await saveOnboardingState(nextState);
    },
    [],
  );

  const setOnboardingStep = useCallback(
    async (
      step: OnboardingStep,
      completedFlags?: Partial<OnboardingCompletedFlags>,
    ) => {
      await updateOnboardingState({ step, completedFlags });
    },
    [updateOnboardingState],
  );

  const completeOnboarding = useCallback(async () => {
    await ensureOnboardingCloudIdentity();

    await updateOnboardingState({
      step: 'complete',
      completed: true,
      completionSource: 'local_setup',
      completedFlags: { profilePhotoSuggested: true },
    });

    schedulePostOnboardingCloudSync();
  }, [updateOnboardingState]);

  return {
    anonymousUserId,
    onboardingState,
    isLoading,
    errorMessage,
    reload,
    updateOnboardingState,
    setOnboardingStep,
    completeOnboarding,
  };
}
