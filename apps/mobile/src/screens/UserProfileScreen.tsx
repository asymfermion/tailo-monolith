import { Text } from 'react-native';

import { t } from '@/i18n';
import { useThemedStyles } from '@/lib/appearance';
import {
  AnonymousAccountUpgradeForm,
  ConnectedAccountProfileForm,
  isLinkedRemoteAccount,
  useAuthAccountStatus,
} from '@/modules/auth';
import { createAccountSettingsStyles } from '@/modules/auth/components/accountSettingsStyles';

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
  const isLinked = isLinkedRemoteAccount(account.session);

  const styles = useThemedStyles(createAccountSettingsStyles);

  if (isLinked) {
    return (
      <ConnectedAccountProfileForm
        mode={mode}
        preferPasswordSetup={preferPasswordSetup}
      />
    );
  }

  return (
    <>
      {mode === 'create' ? null : (
        <>
          <Text style={styles.title}>{t('userProfile.titleAnonymous')}</Text>
          <Text style={styles.body}>{t('userProfile.subtitleAnonymous')}</Text>
        </>
      )}
      <AnonymousAccountUpgradeForm
        mode={mode}
        signInPresentation={signInPresentation}
        onLinked={() => onAnonymousLinked?.()}
      />
    </>
  );
}
