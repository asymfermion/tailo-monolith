import { logTailo, TAILO_LOG_PREFIX } from './tailoLogger';

describe('tailoLogger', () => {
  it('logs with area tag and optional details', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    logTailo('Scan', 'Incremental scan started', {
      createdAfterMs: 1_700_000_000_000,
    });
    logTailo('App', 'Ready');

    expect(warn).toHaveBeenNthCalledWith(
      1,
      TAILO_LOG_PREFIX,
      '[Scan]',
      'Incremental scan started',
      { createdAfterMs: 1_700_000_000_000 },
    );
    expect(warn).toHaveBeenNthCalledWith(2, TAILO_LOG_PREFIX, '[App]', 'Ready');

    warn.mockRestore();
  });
});
