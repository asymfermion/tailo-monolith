import { AccountSettingsScreen } from '@/screens/AccountSettingsScreen';
import { CapturePreviewScreen } from '@/screens/CapturePreviewScreen';
import { CaptureScreen } from '@/screens/CaptureScreen';
import { EventDetailScreen } from '@/screens/EventDetailScreen';

import type { ModalRoute } from './routes';

type ModalShellProps = {
  route: ModalRoute;
};

export function ModalShell({ route }: ModalShellProps) {
  switch (route.name) {
    case 'AccountSettings':
      return <AccountSettingsScreen />;
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
