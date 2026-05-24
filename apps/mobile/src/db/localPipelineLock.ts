let inFlightCount = 0;
const idleWaiters: Array<() => void> = [];

export function beginLocalPipeline(): void {
  inFlightCount += 1;
}

export function endLocalPipeline(): void {
  inFlightCount = Math.max(0, inFlightCount - 1);

  if (inFlightCount === 0) {
    for (const resolve of idleWaiters.splice(0)) {
      resolve();
    }
  }
}

export function isLocalPipelineInFlight(): boolean {
  return inFlightCount > 0;
}

export function waitForLocalPipelineIdle(): Promise<void> {
  if (inFlightCount === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    idleWaiters.push(resolve);
  });
}

/** @internal Test-only reset. */
export function resetLocalPipelineLockForTests(): void {
  inFlightCount = 0;
  idleWaiters.splice(0);
}
