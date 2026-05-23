import { AccountSettingsScreen } from '@/screens/AccountSettingsScreen';
import { CapturePreviewScreen } from '@/screens/CapturePreviewScreen';
import { CaptureScreen } from '@/screens/CaptureScreen';
import { EventDetailScreen } from '@/screens/EventDetailScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/LoginScreen';

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
      return <CaptureScreen />;
    case 'CapturePreview':
      return (
        <CapturePreviewScreen
          height={route.params.height}
          tempUri={route.params.tempUri}
          width={route.params.width}
        />
      );
  }
}
