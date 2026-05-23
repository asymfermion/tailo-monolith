import { useCallback, useEffect, useState } from 'react';

import { getAppFontStyle } from '@/lib/appFontStyle';
import { getAppTheme } from '@/lib/appTheme';
import { getAppLocale } from '@/i18n/locale';

import { isLinkedRemoteAccount } from './authTypes';
import { loadLocalAccountProfile } from './localAccountProfile';
import {
  fetchRemoteAccountProfile,
  type RemoteAccountProfile,
} from './remoteAccountProfile';
import { useAuthAccountStatus } from './useAuthAccountStatus';

export type RemoteAccountProfileState = {
  profile: RemoteAccountProfile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

function buildLocalOnlyProfile(
  displayName: string | null,
): RemoteAccountProfile {
  return {
    appUserId: '',
    displayName,
    preferredLocale: getAppLocale(),
    preferredTheme: getAppTheme(),
    preferredFontStyle: getAppFontStyle(),
  };
}

function mergeAccountProfiles(
  localDisplayName: string | null,
  remote: RemoteAccountProfile | null,
): RemoteAccountProfile | null {
  if (!remote) {
    return localDisplayName ? buildLocalOnlyProfile(localDisplayName) : null;
  }

  return {
    ...remote,
    displayName: remote.displayName ?? localDisplayName,
  };
}

export function useRemoteAccountProfile(): RemoteAccountProfileState {
  const account = useAuthAccountStatus();
  const [profile, setProfile] = useState<RemoteAccountProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    const localProfile = await loadLocalAccountProfile();
    const localDisplayName = localProfile?.displayName ?? null;

    if (!account.isConfigured || !isLinkedRemoteAccount(account.session)) {
      setProfile(mergeAccountProfiles(localDisplayName, null));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const remoteProfile = await fetchRemoteAccountProfile();
      setProfile(mergeAccountProfiles(localDisplayName, remoteProfile));
    } finally {
      setIsLoading(false);
    }
  }, [account.isConfigured, account.session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    profile,
    isLoading: account.isLoading || isLoading,
    refresh,
  };
}
