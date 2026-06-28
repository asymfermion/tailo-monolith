import { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { formatEventType } from '@/lib/formatMoment';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { useDialogMaxWidth } from '@/lib/responsive';
import { logTailo } from '@/lib/tailoLogger';
import type { TimelineEvent } from '@/types';

const wordmarkSource = require('../../../assets/auth/tailo-wordmark-dark-transparent.png');

type ShareMomentSheetProps = {
  visible: boolean;
  event: TimelineEvent | null;
  onClose: () => void;
};

type BusyAction = 'save' | 'share' | null;

function createShareMomentSheetStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    backdrop: {
      backgroundColor: 'rgba(11, 10, 9, 0.45)',
      flex: 1,
      justifyContent: 'flex-end' as const,
    },
    sheet: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      gap: spacing.md,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      width: '100%' as const,
    },
    grabber: {
      backgroundColor: colors.border,
      borderRadius: 3,
      height: 5,
      width: 40,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 18,
      fontWeight: '600' as const,
    },
    preview: {
      backgroundColor: colors.border,
      borderRadius: 18,
      overflow: 'hidden' as const,
      width: 220,
    },
    previewImage: {
      height: 250,
      width: '100%' as const,
    },
    previewOverlay: {
      backgroundColor: 'rgba(21, 20, 18, 0.42)',
      bottom: 0,
      gap: 6,
      left: 0,
      padding: spacing.md,
      position: 'absolute' as const,
      right: 0,
    },
    previewTitle: {
      color: '#FFFFFF',
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    previewCaption: {
      color: 'rgba(255, 255, 255, 0.92)',
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
    },
    previewWordmark: {
      height: 16,
      marginTop: spacing.xs,
      width: 44,
    },
    button: {
      alignItems: 'center' as const,
      borderRadius: 16,
      justifyContent: 'center' as const,
      paddingVertical: 15,
      width: '100%' as const,
    },
    buttonPrimary: {
      backgroundColor: colors.accent,
    },
    buttonPrimaryText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    buttonSecondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    buttonSecondaryText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
    },
    footer: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center' as const,
    },
  };
}

export function ShareMomentSheet({
  visible,
  event,
  onClose,
}: ShareMomentSheetProps) {
  const insets = useSafeAreaInsets();
  const dialogMaxWidth = useDialogMaxWidth();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createShareMomentSheetStyles);
  const shotRef = useRef<View>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  const captureMoment = useCallback(async () => {
    return captureRef(shotRef, { format: 'jpg', quality: 0.95 });
  }, []);

  const handleSave = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy('save');
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert(
          t('timeline.moment.sharePermissionTitle'),
          t('timeline.moment.sharePermissionMessage'),
        );
        return;
      }
      const uri = await captureMoment();
      await MediaLibrary.saveToLibraryAsync(uri);
      onClose();
      Alert.alert(
        t('timeline.moment.shareSavedTitle'),
        t('timeline.moment.shareSavedMessage'),
      );
    } catch (error) {
      logTailo('Sync', 'Failed to save shared moment image', {
        message: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(
        t('timeline.moment.shareFailedTitle'),
        t('timeline.moment.shareFailedMessage'),
      );
    } finally {
      setBusy(null);
    }
  }, [busy, captureMoment, onClose]);

  const handleShareToApp = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy('share');
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          t('timeline.moment.shareFailedTitle'),
          t('timeline.moment.shareUnavailableMessage'),
        );
        return;
      }
      const uri = await captureMoment();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: t('timeline.moment.share'),
      });
      onClose();
    } catch (error) {
      logTailo('Sync', 'Failed to share moment image to another app', {
        message: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(
        t('timeline.moment.shareFailedTitle'),
        t('timeline.moment.shareFailedMessage'),
      );
    } finally {
      setBusy(null);
    }
  }, [busy, captureMoment, onClose]);

  if (!event) {
    return null;
  }

  const primaryMedia = event.media[0];

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel={t('common.cancel')}
        style={styles.backdrop}
        onPress={busy ? undefined : onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              maxWidth: dialogMaxWidth,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
          onPress={() => undefined}
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>{t('timeline.moment.shareTitle')}</Text>

          <View ref={shotRef} collapsable={false} style={styles.preview}>
            {primaryMedia ? (
              <Image
                contentFit="cover"
                source={{ uri: primaryMedia.uri }}
                style={styles.previewImage}
              />
            ) : null}
            <View style={styles.previewOverlay}>
              <Text style={styles.previewTitle}>
                {formatEventType(event.eventType)}
              </Text>
              {event.caption ? (
                <Text numberOfLines={2} style={styles.previewCaption}>
                  {event.caption}
                </Text>
              ) : null}
              <Image
                contentFit="contain"
                source={wordmarkSource}
                style={styles.previewWordmark}
                tintColor="#FFFFFF"
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => void handleSave()}
          >
            {busy === 'save' ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.buttonPrimaryText}>
                {t('timeline.moment.shareSaveAction')}
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => void handleShareToApp()}
          >
            {busy === 'share' ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonSecondaryText}>
                {t('timeline.moment.shareToAppAction')}
              </Text>
            )}
          </Pressable>

          <Text style={styles.footer}>{t('timeline.moment.shareFooter')}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
