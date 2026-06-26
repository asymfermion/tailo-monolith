import { AccountSettingsScreen } from '@/screens/AccountSettingsScreen';
import { CapturePreviewScreen } from '@/screens/CapturePreviewScreen';
import { CaptureScreen } from '@/screens/CaptureScreen';
import { DataProcessingDetailsScreen } from '@/screens/DataProcessingDetailsScreen';
import { EventDetailScreen } from '@/screens/EventDetailScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { NotificationSettingsScreen } from '@/screens/NotificationSettingsScreen';
import { NotificationsInboxScreen } from '@/screens/NotificationsInboxScreen';
import { PetProfileDetailsScreen } from '@/screens/PetProfileDetailsScreen';
import { PrivacyPermissionsScreen } from '@/screens/PrivacyPermissionsScreen';
import { PrivacyPolicyScreen } from '@/screens/PrivacyPolicyScreen';

import { logAuth } from '@/modules/auth/authLogger';

import type { ModalRoute } from './routes';
import { useNavigation } from './NavigationContext';

type ModalShellProps = {
  route: ModalRoute;
};

export function ModalShell({ route }: ModalShellProps) {
  const navigation = useNavigation();

  switch (route.name) {
    case 'AccountSettings':
      return (
        <AccountSettingsScreen
          mode={route.params?.mode}
          signInPresentation={route.params?.signInPresentation}
        />
      );
    case 'Login':
      return (
        <LoginScreen
          onCancel={navigation.pop}
          onSignedIn={() => {
            logAuth('Modal login UI finished');
          }}
          variant={route.params?.variant ?? 'welcome'}
        />
      );
    case 'ForgotPassword':
      return (
        <ForgotPasswordScreen
          onBack={navigation.pop}
          onSignedIn={() => {
            logAuth('Modal forgot-password UI finished');
          }}
        />
      );
    case 'EventDetail': {
      const localEventId = route.params.localEventId;

      if (!localEventId) {
        return null;
      }

      return <EventDetailScreen localEventId={localEventId} />;
    }
    case 'Capture':
      return <CaptureScreen purpose={route.params?.purpose} />;
    case 'CapturePreview':
      return (
        <CapturePreviewScreen
          height={route.params.height}
          purpose={route.params.purpose}
          tempUri={route.params.tempUri}
          width={route.params.width}
        />
      );
    case 'NotificationsInbox':
      return <NotificationsInboxScreen />;
    case 'NotificationSettings':
      return <NotificationSettingsScreen />;
    case 'PetProfileDetails':
      return <PetProfileDetailsScreen />;
    case 'PrivacyPermissions':
      return <PrivacyPermissionsScreen />;
    case 'PrivacyPolicy':
      return <PrivacyPolicyScreen />;
    case 'DataProcessingDetails':
      return <DataProcessingDetailsScreen />;
  }
}
