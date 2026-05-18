import { useCallback, useEffect, useState } from 'react';

import { loadLocalPetProfile, type LocalPetProfile } from './petProfile';

export type LocalPetProfileState = {
  profile: LocalPetProfile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export function useLocalPetProfile(): LocalPetProfileState {
  const [profile, setProfile] = useState<LocalPetProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      setProfile(await loadLocalPetProfile());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    profile,
    isLoading,
    refresh,
  };
}
