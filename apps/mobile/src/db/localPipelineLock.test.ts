import {
  beginLocalPipeline,
  endLocalPipeline,
  isLocalPipelineInFlight,
  resetLocalPipelineLockForTests,
  waitForLocalPipelineIdle,
} from './localPipelineLock';

describe('localPipelineLock', () => {
  beforeEach(() => {
    resetLocalPipelineLockForTests();
  });

  it('tracks in-flight pipeline runs', () => {
    expect(isLocalPipelineInFlight()).toBe(false);

    beginLocalPipeline();
    expect(isLocalPipelineInFlight()).toBe(true);

    endLocalPipeline();
    expect(isLocalPipelineInFlight()).toBe(false);
  });

  it('resolves waiters when the pipeline becomes idle', async () => {
    beginLocalPipeline();

    const idlePromise = waitForLocalPipelineIdle();
    let resolved = false;
    void idlePromise.then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    endLocalPipeline();
    await idlePromise;
    expect(resolved).toBe(true);
  });
});
