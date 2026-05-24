import { useState } from 'react';

import {
  AnonymousAccountUpgradeForm,
  ConnectedAccountProfileForm,
  isLinkedRemoteAccount,
  useAuthAccountStatus,
} from '@/modules/auth';
import { AnonymousProfileUpgradePrompt } from '@/modules/auth/components/AnonymousProfileUpgradePrompt';

type UserProfileScreenProps = {
  mode?: 'link' | 'create';
  signInPresentation?: 'pop';
  preferPasswordSetup?: boolean;
  onAnonymousLinked?: () => void;
};

/**
 * Your Tailo account profile — identity, preferences, and sign-in (not pet profile).
 */
export function UserProfileScreen({
  mode = 'link',
  signInPresentation,
  preferPasswordSetup = false,
  onAnonymousLinked,
}: UserProfileScreenProps) {
  const account = useAuthAccountStatus();
  const [isEmailLinkInProgress, setIsEmailLinkInProgress] = useState(false);
  const isLinked = isLinkedRemoteAccount(account.session);
  const showConnectedProfile = isLinked && !isEmailLinkInProgress;

  const handleLinked = () => {
    setIsEmailLinkInProgress(false);
    onAnonymousLinked?.();
  };

  if (showConnectedProfile) {
    return (
      <ConnectedAccountProfileForm
        mode={mode}
        preferPasswordSetup={preferPasswordSetup}
      />
    );
  }

  if (mode === 'create') {
    return (
      <AnonymousAccountUpgradeForm
        mode={mode}
        presentation="standalone"
        signInPresentation={signInPresentation}
        onLinkFlowStart={() => setIsEmailLinkInProgress(true)}
        onLinked={handleLinked}
      />
    );
  }

  return (
    <>
      <AnonymousProfileUpgradePrompt />
      <AnonymousAccountUpgradeForm
        mode={mode}
        presentation="profile"
        signInPresentation={signInPresentation}
        onLinkFlowStart={() => setIsEmailLinkInProgress(true)}
        onLinked={handleLinked}
      />
    </>
  );
}
