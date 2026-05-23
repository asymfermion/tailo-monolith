import { getAppFontStyle } from '@/lib/appFontStyle';
import { getAppTheme } from '@/lib/appTheme';
import { getAppLocale } from '@/i18n/locale';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets';

import { logAuth } from './authLogger';
import { isLinkedRemoteAccount } from './authTypes';
import { getAuthProvider } from './authProviderInstance';
import { ensureCurrentUserIfNeeded } from './ensureCurrentUser';
import { linkLegacyAnonymousUserIfNeeded } from './legacyAnonymousLink';
import { syncRemoteAccountProfile } from './remoteAccountProfile';

export type CompleteEmailAccountConnectionResult =
  | { status: 'skipped' }
  | { status: 'completed' }
  | { status: 'partial'; message: string };

/**
 * Runs Tailo-side bootstrap after email link, sign-in, or password reset.
 * Idempotent — safe after every successful connected session.
 */
export async function completeEmailAccountConnection(): Promise<CompleteEmailAccountConnectionResult> {
  logAuth('Email account bootstrap started');

  if (!getAuthProvider().isConfigured()) {
    logAuth('Email account bootstrap skipped (auth not configured)');
    return { status: 'skipped' };
  }

  const ensureResult = await ensureCurrentUserIfNeeded();
  logAuth('Ensure current user finished', { status: ensureResult.status });

  if (ensureResult.status === 'error') {
    logAuth('Email account bootstrap partial (ensure failed)', {
      message: ensureResult.message,
    });
    return { status: 'partial', message: ensureResult.message };
  }

  await linkLegacyAnonymousUserIfNeeded();
  logAuth('Legacy anonymous link step finished');

  const session = await getAuthProvider().getSession();

  if (!isLinkedRemoteAccount(session)) {
    logAuth('Email account bootstrap completed (session not linked yet)');
    return { status: 'completed' };
  }

  const profileResult = await syncRemoteAccountProfile({
    preferredLocale: getAppLocale(),
    preferredTheme: getAppTheme(),
    preferredFontStyle: getAppFontStyle(),
  });
  logAuth('Remote account profile sync finished', {
    status: profileResult.status,
  });

  if (profileResult.status === 'error') {
    logAuth('Email account bootstrap partial (profile sync failed)', {
      message: profileResult.message,
    });
    return { status: 'partial', message: profileResult.message };
  }

  await syncRemotePetProfileIfNeeded();
  logAuth('Email account bootstrap completed');

  return { status: 'completed' };
}
