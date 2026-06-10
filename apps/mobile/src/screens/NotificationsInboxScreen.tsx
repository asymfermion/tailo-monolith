import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NotificationRecord } from '@tailo/shared';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { useNavigation } from '@/navigation/NavigationContext';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';
import { useNotificationsInbox } from '@/modules/notifications';

function createNotificationInboxStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    header: {
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 26,
      fontWeight: '600' as const,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: spacing.xl,
      paddingTop: spacing.lg,
      gap: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    cardRead: {
      opacity: 0.72,
    },
    cardTitleRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    cardTitle: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
      marginRight: spacing.sm,
    },
    unreadDot: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      height: 8,
      width: 8,
    },
    cardBody: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    cardMeta: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 12,
    },
    emptyState: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 240,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 18,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    emptyBody: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.xs,
      textAlign: 'center' as const,
    },
  };
}

export function NotificationsInboxScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useThemedStyles(createNotificationInboxStyles);
  const inbox = useNotificationsInbox();

  const openNotification = useCallback(
    (notification: NotificationRecord) => {
      void (async () => {
        await inbox.openNotification(notification);

        const target = notification.target;
        if (target.type === 'timeline') {
          navigation.setActiveTab('Timeline');
          navigation.pop();
          return;
        }

        if (target.type === 'account_settings') {
          navigation.push('AccountSettings', {
            mode: target.mode,
          });
          return;
        }

        if (target.type === 'event_detail') {
          navigation.push('EventDetail', {
            localEventId: target.local_event_id,
          });
        }
      })();
    },
    [inbox, navigation],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: getModalHeaderTopInset(insets.top),
        },
      ]}
    >
      <ModalBackButton align="leading" onPress={navigation.pop} />
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.inboxTitle')}</Text>
        <Text style={styles.subtitle}>
          {inbox.unreadCount > 0
            ? t('notifications.unreadCount', {
                count: String(inbox.unreadCount),
              })
            : t('notifications.inboxSubtitle')}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {inbox.notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('notifications.emptyBody')}</Text>
          </View>
        ) : (
          inbox.notifications.map((notification) => (
            <Pressable
              key={notification.notification_id}
              accessibilityRole="button"
              style={[
                styles.card,
                notification.read_at ? styles.cardRead : null,
              ]}
              onPress={() => openNotification(notification)}
            >
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{notification.title}</Text>
                {notification.read_at ? null : <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.cardBody}>{notification.body}</Text>
              <Text style={styles.cardMeta}>
                {notification.read_at
                  ? t('notifications.readLabel')
                  : t('notifications.unreadLabel')}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
