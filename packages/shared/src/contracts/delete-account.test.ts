import { describe, expect, it } from 'vitest';

import { isDeleteAccountResponse } from './delete-account';

describe('delete-account contracts', () => {
  it('accepts a valid delete response', () => {
    expect(
      isDeleteAccountResponse({
        deleted: true,
        app_user_id: 'app-user-1',
        auth_user_id: 'auth-user-1',
      }),
    ).toBe(true);
  });

  it('accepts null app_user_id when no Tailo rows existed', () => {
    expect(
      isDeleteAccountResponse({
        deleted: true,
        app_user_id: null,
        auth_user_id: 'auth-user-1',
      }),
    ).toBe(true);
  });

  it('rejects invalid payloads', () => {
    expect(isDeleteAccountResponse(null)).toBe(false);
    expect(isDeleteAccountResponse({ deleted: false })).toBe(false);
  });
});
