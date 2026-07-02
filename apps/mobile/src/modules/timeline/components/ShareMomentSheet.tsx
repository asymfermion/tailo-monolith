import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { getFontFamilyForStyle } from '@/constants/typography';
import { formatEventType, formatTimestamp } from '@/lib/formatMoment';
import { t } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { logTailo } from '@/lib/tailoLogger';
import type { TimelineEvent, TimelineEventMedia } from '@/types';

import { shouldContainMomentImage } from './momentImageFit';
import {
  EXPORT_BACKGROUND,
  EXPORT_BORDER,
  EXPORT_METADATA_FONT_SIZE,
  EXPORT_METADATA_LINE_HEIGHT,
  EXPORT_MUTED_TEXT,
  EXPORT_PREVIEW_HEIGHT,
  EXPORT_PREVIEW_WIDTH,
  EXPORT_SPECKLES,
  EXPORT_SURFACE,
  EXPORT_TEXT,
  EXPORT_WATERMARK_HEIGHT,
  EXPORT_WATERMARK_WIDTH,
  getShareMomentExportLayout,
  getShareMomentExportMedia,
  scaleExport,
  type ShareMomentExportFrame,
  type ShareMomentExportLayout,
} from './shareMomentExportLayout';

const wordmarkSource = require('../../../assets/auth/tailo-wordmark-dark-transparent.png');

type ShareMomentSheetProps = {
  visible: boolean;
  event: TimelineEvent | null;
  onClose: () => void;
};

type BusyAction = 'save' | 'share' | null;

function createShareMomentSheetStyles({
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: '#F3EEE7',
      flex: 1,
    },
    topBar: {
      alignItems: 'center' as const,
      backgroundColor: EXPORT_SURFACE,
      borderBottomColor: EXPORT_BORDER,
      borderBottomWidth: 1,
      flexDirection: 'row' as const,
      height: 52,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.md,
      width: '100%' as const,
    },
    topIconButton: {
      alignItems: 'center' as const,
      height: 40,
      justifyContent: 'center' as const,
      width: 40,
      zIndex: 1,
    },
    topTitle: {
      color: EXPORT_TEXT,
      fontFamily: getFontFamily('600'),
      fontSize: 17,
      fontWeight: '600' as const,
      left: 0,
      lineHeight: 22,
      position: 'absolute' as const,
      right: 0,
      textAlign: 'center' as const,
      top: 15,
    },
    stage: {
      alignItems: 'center' as const,
      backgroundColor: '#25211D',
      flex: 1,
      width: '100%' as const,
    },
    preview: {
      backgroundColor: EXPORT_BACKGROUND,
      borderColor: EXPORT_BORDER,
      borderRadius: scaleExport(25.214),
      borderWidth: scaleExport(1.401),
      height: EXPORT_PREVIEW_HEIGHT,
      marginTop: 12,
      overflow: 'hidden' as const,
      width: EXPORT_PREVIEW_WIDTH,
    },
    previewSpeckle: {
      backgroundColor: 'rgba(21, 20, 18, 0.07)',
      borderRadius: 1,
      height: scaleExport(2.802),
      position: 'absolute' as const,
      width: scaleExport(2.802),
    },
    exportPhotoFrame: {
      backgroundColor: '#BCA888',
      overflow: 'hidden' as const,
      position: 'absolute' as const,
    },
    exportPhotoBackdrop: {
      ...StyleSheet.absoluteFill,
      opacity: 0.35,
    },
    exportPhotoImage: {
      ...StyleSheet.absoluteFill,
    },
    exportTitle: {
      color: EXPORT_TEXT,
      fontFamily: getFontFamilyForStyle('elegant', '500'),
      fontWeight: '500' as const,
      position: 'absolute' as const,
    },
    exportCaption: {
      color: EXPORT_TEXT,
      fontFamily: getFontFamily('500'),
      fontWeight: '500' as const,
      position: 'absolute' as const,
    },
    exportMetadata: {
      color: EXPORT_MUTED_TEXT,
      fontFamily: getFontFamily('400'),
      fontSize: EXPORT_METADATA_FONT_SIZE,
      lineHeight: EXPORT_METADATA_LINE_HEIGHT,
      position: 'absolute' as const,
    },
    previewWatermark: {
      height: EXPORT_WATERMARK_HEIGHT,
      position: 'absolute' as const,
      width: EXPORT_WATERMARK_WIDTH,
    },
    button: {
      alignItems: 'center' as const,
      flex: 1,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      height: 50,
      borderRadius: 16,
      justifyContent: 'center' as const,
    },
    buttonPrimary: {
      backgroundColor: EXPORT_TEXT,
    },
    buttonPrimaryText: {
      color: EXPORT_SURFACE,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    buttonSecondary: {
      backgroundColor: EXPORT_SURFACE,
      borderColor: EXPORT_BORDER,
      borderWidth: 1,
    },
    buttonSecondaryText: {
      color: EXPORT_TEXT,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    actions: {
      backgroundColor: EXPORT_SURFACE,
      borderTopColor: EXPORT_BORDER,
      borderTopWidth: 1,
      height: 86,
      paddingHorizontal: 20,
      paddingTop: 11,
      width: '100%' as const,
    },
    actionRow: {
      flexDirection: 'row' as const,
      gap: 17,
    },
  };
}

export function ShareMomentSheet({
  visible,
  event,
  onClose,
}: ShareMomentSheetProps) {
  const insets = useSafeAreaInsets();
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
        t('timeline.moment.shareSaveFailedTitle'),
        t('timeline.moment.shareSaveFailedMessage'),
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
  }, [busy, captureMoment]);

  if (!event) {
    return null;
  }

  const exportMedia = getShareMomentExportMedia(event.media);
  const exportLayout = getShareMomentExportLayout(exportMedia.length);
  const exportPhotoCountLabel =
    exportMedia.length === 1
      ? t('timeline.moment.photoCountSingle')
      : t('timeline.moment.photoCountPlural', {
          count: String(exportMedia.length),
        });

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={{ height: insets.top }} />
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel={t('common.cancel')}
            accessibilityRole="button"
            hitSlop={16}
            style={styles.topIconButton}
            onPress={busy ? undefined : onClose}
          >
            <Ionicons color={EXPORT_TEXT} name="close" size={24} />
          </Pressable>
          <Text pointerEvents="none" style={styles.topTitle}>
            {t('timeline.moment.sharePreview')}
          </Text>
          <View style={styles.topIconButton} />
        </View>

        <View style={styles.stage}>
          <View ref={shotRef} collapsable={false} style={styles.preview}>
            {EXPORT_SPECKLES.map((speckle, index) => (
              <View
                key={index}
                style={[
                  styles.previewSpeckle,
                  {
                    left: scaleExport(speckle.left),
                    top: scaleExport(speckle.top),
                  },
                ]}
              />
            ))}
            <ShareMomentExportPhotos
              layout={exportLayout}
              media={exportMedia}
              styles={styles}
            />
            <Text
              numberOfLines={2}
              style={[
                styles.exportTitle,
                {
                  fontSize: exportLayout.text.titleFontSize,
                  left: exportLayout.text.textLeft,
                  lineHeight: exportLayout.text.titleLineHeight,
                  top: exportLayout.text.titleTop,
                  width: exportLayout.text.titleWidth,
                },
              ]}
            >
              {formatEventType(event.eventType)}
            </Text>
            {event.caption ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.exportCaption,
                  {
                    fontSize: exportLayout.text.captionFontSize,
                    left: exportLayout.text.textLeft,
                    lineHeight: exportLayout.text.captionLineHeight,
                    top: exportLayout.text.captionTop,
                    width: exportLayout.text.captionWidth,
                  },
                ]}
              >
                {event.caption}
              </Text>
            ) : null}
            <Text
              style={[
                styles.exportMetadata,
                {
                  left: exportLayout.text.textLeft,
                  top: exportLayout.text.metadataTop,
                  width: exportLayout.text.metadataWidth,
                },
              ]}
            >
              {formatTimestamp(event.timestamp)} · {exportPhotoCountLabel}
            </Text>
            <Image
              contentFit="contain"
              source={wordmarkSource}
              style={[
                styles.previewWatermark,
                {
                  left: exportLayout.text.watermarkLeft,
                  top: exportLayout.text.watermarkTop,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityLabel={t('timeline.moment.shareSaveAction')}
              accessibilityRole="button"
              disabled={busy !== null}
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => void handleSave()}
            >
              {busy === 'save' ? (
                <ActivityIndicator color={EXPORT_TEXT} />
              ) : (
                <>
                  <Ionicons
                    color={EXPORT_TEXT}
                    name="download-outline"
                    size={20}
                  />
                  <Text style={styles.buttonSecondaryText}>
                    {t('timeline.moment.shareSaveShort')}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityLabel={t('timeline.moment.shareToAppAction')}
              accessibilityRole="button"
              disabled={busy !== null}
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => void handleShareToApp()}
            >
              {busy === 'share' ? (
                <ActivityIndicator color={EXPORT_SURFACE} />
              ) : (
                <>
                  <Ionicons
                    color={EXPORT_SURFACE}
                    name="paper-plane-outline"
                    size={20}
                  />
                  <Text style={styles.buttonPrimaryText}>
                    {t('timeline.moment.shareShareShort')}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type ShareMomentExportPhotosProps = {
  layout: ShareMomentExportLayout;
  media: TimelineEventMedia[];
  styles: ReturnType<typeof createShareMomentSheetStyles>;
};

function ShareMomentExportPhotos({
  layout,
  media,
  styles,
}: ShareMomentExportPhotosProps) {
  return (
    <>
      {media.map((item, index) => (
        <ShareMomentExportPhoto
          key={item.localAssetId}
          frame={layout.photos[index]}
          item={item}
          styles={styles}
        />
      ))}
    </>
  );
}

type ShareMomentExportPhotoProps = {
  frame: ShareMomentExportFrame | undefined;
  item: TimelineEventMedia;
  styles: ReturnType<typeof createShareMomentSheetStyles>;
};

function ShareMomentExportPhoto({
  frame,
  item,
  styles,
}: ShareMomentExportPhotoProps) {
  if (!frame) {
    return null;
  }

  const source = { uri: item.uri };
  const { contentFit, ...frameStyle } = frame;
  const shouldContain =
    contentFit === 'contain' || (!contentFit && shouldContainMomentImage(item));

  return (
    <View style={[styles.exportPhotoFrame, frameStyle]}>
      {shouldContain ? (
        <>
          <Image
            blurRadius={18}
            contentFit="cover"
            source={source}
            style={styles.exportPhotoBackdrop}
          />
          <Image
            contentFit="contain"
            source={source}
            style={styles.exportPhotoImage}
          />
        </>
      ) : (
        <Image
          contentFit="cover"
          source={source}
          style={styles.exportPhotoImage}
        />
      )}
    </View>
  );
}
