import { TAILO_LOG_PREFIX } from '@/lib/tailoLogger';

import { logAuth } from './authLogger';

describe('authLogger', () => {
  it('logs with Auth area tag', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    logAuth('Password sign-in started', { status: 'signed_in' });

    expect(warn).toHaveBeenCalledWith(
      TAILO_LOG_PREFIX,
      '[Auth]',
      'Password sign-in started',
      { status: 'signed_in' },
    );

    warn.mockRestore();
  });
});
