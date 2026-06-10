import { useCallback, useEffect, useState } from 'react';
import type { NotificationRecord } from '@tailo/shared';

import { logTailo } from '@/lib/tailoLogger';

import {
  loadNotifications,
  loadUnreadNotificationsCount,
  markNotificationAsRead,
} from './notificationService';
import { subscribeToNotificationChanges } from './notificationStore';

export type NotificationsInboxState = {
  notifications: NotificationRecord[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  openNotification: (notification: NotificationRecord) => Promise<void>;
};

export function useNotificationsInbox(): NotificationsInboxState {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextNotifications, nextUnreadCount] = await Promise.all([
      loadNotifications({ includeRead: true, limit: 200 }),
      loadUnreadNotificationsCount(),
    ]);
    setNotifications(nextNotifications);
    setUnreadCount(nextUnreadCount);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await refresh();
      } catch (error) {
        logTailo('Sync', 'Failed to load inbox', {
          message: error instanceof Error ? error.message : 'Unknown error.',
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToNotificationChanges(() => {
      void refresh();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  const openNotification = useCallback(
    async (notification: NotificationRecord) => {
      await markNotificationAsRead(notification.notification_id);
    },
    [],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    openNotification,
  };
}
