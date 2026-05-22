import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { MediaDetectionDebugBadge } from '@/components/MediaDetectionDebugBadge';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import type { TimelineEventMedia } from '@/types';

type MomentMediaReorderGalleryProps = {
  media: TimelineEventMedia[];
  isSaving: boolean;
  onMove: (localAssetId: string, direction: 'up' | 'down') => void;
};

function createMomentMediaReorderGalleryStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    gallery: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    hint: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginBottom: spacing.xs,
    },
    row: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.md,
    },
    thumbFrame: {
      flex: 1,
      position: 'relative' as const,
    },
    thumb: {
      aspectRatio: 1.2,
      backgroundColor: colors.border,
      borderRadius: 12,
      width: '100%' as const,
    },
    coverBadge: {
      backgroundColor: 'rgba(28, 28, 26, 0.72)',
      borderRadius: 8,
      bottom: spacing.sm,
      left: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      position: 'absolute' as const,
    },
    coverBadgeText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 11,
      fontWeight: '600' as const,
    },
    controls: {
      gap: spacing.xs,
    },
    moveButton: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center' as const,
      width: 40,
    },
    moveButtonDisabled: {
      opacity: 0.45,
    },
  };
}

export function MomentMediaReorderGallery({
  media,
  isSaving,
  onMove,
}: MomentMediaReorderGalleryProps) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createMomentMediaReorderGalleryStyles);

  if (media.length === 0) {
    return null;
  }

  return (
    <View style={styles.gallery}>
      <Text style={styles.sectionLabel}>{t('eventDetail.photosSection')}</Text>
      <Text style={styles.hint}>{t('eventDetail.photosReorderHint')}</Text>
      {media.map((item, index) => {
        const isCover = index === 0;

        return (
          <View key={item.localAssetId} style={styles.row}>
            <View style={styles.thumbFrame}>
              <Image
                accessibilityLabel={
                  isCover
                    ? t('accessibility.primaryMomentPhoto')
                    : t('accessibility.momentPhoto')
                }
                contentFit="cover"
                source={{ uri: item.uri }}
                style={styles.thumb}
              />
              <MediaDetectionDebugBadge media={item} />
              {isCover ? (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>
                    {t('eventDetail.coverPhoto')}
                  </Text>
                </View>
              ) : null}
            </View>
            {media.length > 1 ? (
              <View style={styles.controls}>
                <Pressable
                  accessibilityLabel={t('eventDetail.movePhotoUp')}
                  accessibilityRole="button"
                  disabled={isSaving || index === 0}
                  hitSlop={8}
                  style={[
                    styles.moveButton,
                    (isSaving || index === 0) && styles.moveButtonDisabled,
                  ]}
                  onPress={() => onMove(item.localAssetId, 'up')}
                >
                  <Ionicons
                    color={index === 0 ? colors.border : colors.text}
                    name="chevron-up"
                    size={22}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={t('eventDetail.movePhotoDown')}
                  accessibilityRole="button"
                  disabled={isSaving || index === media.length - 1}
                  hitSlop={8}
                  style={[
                    styles.moveButton,
                    (isSaving || index === media.length - 1) &&
                      styles.moveButtonDisabled,
                  ]}
                  onPress={() => onMove(item.localAssetId, 'down')}
                >
                  <Ionicons
                    color={
                      index === media.length - 1 ? colors.border : colors.text
                    }
                    name="chevron-down"
                    size={22}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
