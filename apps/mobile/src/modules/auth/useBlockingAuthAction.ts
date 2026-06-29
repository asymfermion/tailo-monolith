import { useCallback, useState } from 'react';

export type UseBlockingAuthActionResult = {
  isBlockingAuthInProgress: boolean;
  runBlockingAuthAction: <T>(action: () => Promise<T>) => Promise<T>;
};

/**
 * Shared UI helper for auth transitions that must block interaction
 * (e.g. OAuth redirect handoff + callback return).
 */
export function useBlockingAuthAction(): UseBlockingAuthActionResult {
  const [isBlockingAuthInProgress, setIsBlockingAuthInProgress] =
    useState(false);

  const runBlockingAuthAction = useCallback(
    async <T>(action: () => Promise<T>) => {
      setIsBlockingAuthInProgress(true);

      try {
        return await action();
      } finally {
        setIsBlockingAuthInProgress(false);
      }
    },
    [],
  );

  return { isBlockingAuthInProgress, runBlockingAuthAction };
}
