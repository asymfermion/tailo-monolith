import { useEffect, useState } from 'react';

import { logTailo } from '@/lib/tailoLogger';

import { loadUnreadNotificationsCount } from './notificationService';
import { subscribeToNotificationChanges } from './notificationStore';

export function useUnreadNotificationsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const reload = () => {
      void (async () => {
        try {
          const unread = await loadUnreadNotificationsCount();

          if (active) {
            setCount(unread);
          }
        } catch (error) {
          logTailo('Sync', 'Failed to load unread count', {
            message: error instanceof Error ? error.message : 'Unknown error.',
          });
        }
      })();
    };

    reload();
    const unsubscribe = subscribeToNotificationChanges(reload);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return count;
}
