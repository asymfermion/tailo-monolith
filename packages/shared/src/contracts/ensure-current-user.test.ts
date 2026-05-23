import { describe, expect, it } from 'vitest';

import { isEnsureCurrentUserResponse } from './ensure-current-user';

describe('isEnsureCurrentUserResponse', () => {
  it('accepts valid responses', () => {
    expect(
      isEnsureCurrentUserResponse({
        app_user_id: 'app-user-1',
        user_id: 'supabase-user-1',
        created_app_user: true,
        created_supabase_identity: true,
        created_email_identity: false,
      }),
    ).toBe(true);
  });

  it('rejects invalid responses', () => {
    expect(isEnsureCurrentUserResponse(null)).toBe(false);
    expect(
      isEnsureCurrentUserResponse({
        app_user_id: 'app-user-1',
        user_id: 'supabase-user-1',
      }),
    ).toBe(false);
  });
});
