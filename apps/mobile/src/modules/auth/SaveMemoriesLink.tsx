import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { t, useAppLocale } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { useNavigation } from '@/navigation/NavigationContext';
import { workspaceSecureStorage } from '@/modules/auth/localWorkspace';
import {
  SAVE_MEMORIES_FIRST_VALUE_SEEN_AT_KEY,
  SAVE_MEMORIES_LAST_PROMPT_SHOWN_AT_KEY,
  SAVE_MEMORIES_SNOOZED_UNTIL_KEY,
} from '@/modules/auth/keys';
import {
  SAVE_MEMORIES_REMINDER,
  shouldShowSaveMemoriesReminder,
} from '@/modules/auth/saveMemoriesReminder';

import { useAuthAccountStatus } from './useAuthAccountStatus';

function createSaveMemoriesLinkStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
    },
    copy: {
      gap: spacing.xs,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    buttonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
    },
    dismissButton: {
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    dismissButtonText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('500'),
      fontSize: 13,
      fontWeight: '500' as const,
    },
  };
}

/** Soft entry to email account upgrade — only for anonymous remote sessions. */
export function SaveMemoriesLink({
  hasTimelineValue,
}: {
  hasTimelineValue: boolean;
}) {
  useAppLocale();
  const navigation = useNavigation();
  const account = useAuthAccountStatus();
  const styles = useThemedStyles(createSaveMemoriesLinkStyles);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!hasTimelineValue) {
        if (active) {
          setIsVisible(false);
          setIsReady(true);
        }
        return;
      }

      const now = Date.now();
      const [firstSeenRaw, lastShownRaw, snoozedUntilRaw] = await Promise.all([
        workspaceSecureStorage.getItemAsync(
          SAVE_MEMORIES_FIRST_VALUE_SEEN_AT_KEY,
        ),
        workspaceSecureStorage.getItemAsync(
          SAVE_MEMORIES_LAST_PROMPT_SHOWN_AT_KEY,
        ),
        workspaceSecureStorage.getItemAsync(SAVE_MEMORIES_SNOOZED_UNTIL_KEY),
      ]);

      let firstSeenAtMs = parseTimestampMs(firstSeenRaw);

      if (!firstSeenAtMs) {
        firstSeenAtMs = now;
        await workspaceSecureStorage.setItemAsync(
          SAVE_MEMORIES_FIRST_VALUE_SEEN_AT_KEY,
          String(firstSeenAtMs),
        );
      }

      const nextVisible = shouldShowSaveMemoriesReminder({
        nowMs: now,
        hasTimelineValue,
        firstTimelineValueSeenAtMs: firstSeenAtMs,
        lastPromptShownAtMs: parseTimestampMs(lastShownRaw),
        snoozedUntilMs: parseTimestampMs(snoozedUntilRaw),
      });

      if (nextVisible) {
        await workspaceSecureStorage.setItemAsync(
          SAVE_MEMORIES_LAST_PROMPT_SHOWN_AT_KEY,
          String(now),
        );
      }

      if (!active) {
        return;
      }

      setIsVisible(nextVisible);
      setIsReady(true);
    })();

    return () => {
      active = false;
    };
  }, [hasTimelineValue]);

  const canRender = useMemo(
    () =>
      !account.isLoading &&
      account.isConfigured &&
      account.session?.isAnonymous &&
      isReady &&
      isVisible,
    [
      account.isConfigured,
      account.isLoading,
      account.session?.isAnonymous,
      isReady,
      isVisible,
    ],
  );

  if (!canRender) {
    return null;
  }

  const handleSnooze = () => {
    setIsVisible(false);
    void workspaceSecureStorage.setItemAsync(
      SAVE_MEMORIES_SNOOZED_UNTIL_KEY,
      String(Date.now() + SAVE_MEMORIES_REMINDER.snoozeIntervalMs),
    );
  };

  const handleOpenUpgrade = () => {
    setIsVisible(false);
    void workspaceSecureStorage.setItemAsync(
      SAVE_MEMORIES_SNOOZED_UNTIL_KEY,
      String(Date.now() + SAVE_MEMORIES_REMINDER.openedIntervalMs),
    );
    navigation.push('AccountSettings', { mode: 'link' });
  };

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('account.title')}</Text>
        <Text style={styles.body}>{t('account.body')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={handleOpenUpgrade}
      >
        <Text style={styles.buttonText}>{t('account.saveMemoriesLink')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.dismissButton}
        onPress={handleSnooze}
      >
        <Text style={styles.dismissButtonText}>{t('common.cancel')}</Text>
      </Pressable>
    </View>
  );
}

function parseTimestampMs(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
