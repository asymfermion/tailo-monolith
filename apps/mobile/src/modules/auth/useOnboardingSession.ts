import { useCallback, useEffect, useRef, useState } from 'react';

import { getOrCreateAnonymousUserId } from './identity';
import { getAuthSession, isRemoteAuthConfigured } from './authService';
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

export type OnboardingSessionState = {
  anonymousUserId: string | null;
  onboardingState: OnboardingState;
  isLoading: boolean;
  errorMessage: string | null;
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

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const nextAnonymousUserId = isRemoteAuthConfigured()
          ? ((await getAuthSession())?.userId ?? null)
          : await getOrCreateAnonymousUserId();
        const storedOnboardingState = await loadOnboardingState();
        const resolvedOnboardingState = await loadResolvedOnboardingState(
          mergeOnboardingState(storedOnboardingState, {
            completedFlags: { identityCreated: true },
          }),
        );
        await saveOnboardingState(resolvedOnboardingState);

        if (isMounted) {
          setAnonymousUserId(nextAnonymousUserId);
          setOnboardingState(resolvedOnboardingState);
          onboardingStateRef.current = resolvedOnboardingState;
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Could not prepare first session.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

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
    await updateOnboardingState({
      step: 'complete',
      completed: true,
      completedFlags: { profilePhotoSuggested: true },
    });
  }, [updateOnboardingState]);

  return {
    anonymousUserId,
    onboardingState,
    isLoading,
    errorMessage,
    updateOnboardingState,
    setOnboardingStep,
    completeOnboarding,
  };
}
