import { useEffect, useState } from 'react';
import { EVENT_TYPES } from '@tailo/shared';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MediaDetectionDebugBadge } from '@/components/MediaDetectionDebugBadge';
import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { formatEventType, formatTimestamp } from '@/lib/formatMoment';
import { useNavigation } from '@/navigation/NavigationContext';
import { useEventDetail } from '@/modules/timeline/useEventDetail';
import type { TimelineEventMedia } from '@/types';

const EDITABLE_EVENT_TYPES = EVENT_TYPES.filter((type) => type !== 'unknown');

type EventDetailScreenProps = {
  localEventId: string;
};

export function EventDetailScreen({ localEventId }: EventDetailScreenProps) {
  const navigation = useNavigation();
  const detail = useEventDetail(localEventId);
  const [captionDraft, setCaptionDraft] = useState('');

  useEffect(() => {
    setCaptionDraft(detail.event?.caption ?? '');
  }, [detail.event?.caption, detail.event?.localEventId]);

  if (detail.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.centeredText}>{t('eventDetail.loading')}</Text>
      </View>
    );
  }

  if (!detail.event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          {t('eventDetail.unavailableTitle')}
        </Text>
        <Text style={styles.centeredText}>
          {detail.errorMessage ?? t('errors.momentNotFound')}
        </Text>
        <Pressable style={styles.backButton} onPress={navigation.pop}>
          <Text style={styles.backButtonText}>
            {t('eventDetail.backToTimeline')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const { event } = detail;
  const orderedMedia = [...event.media].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return 0;
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" onPress={navigation.pop}>
          <Text style={styles.backLink}>{t('common.back')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={detail.isSaving}
          onPress={() =>
            void detail.saveUpdate({ isFavorite: !event.isFavorite })
          }
        >
          <Text style={styles.favoriteAction}>
            {event.isFavorite
              ? t('eventDetail.favorited')
              : t('eventDetail.addFavorite')}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.timestamp}>{formatTimestamp(event.timestamp)}</Text>

      <View style={styles.gallery}>
        {orderedMedia.map((media, index) => (
          <GalleryImage
            key={media.localAssetId}
            isHero={index === 0}
            media={media}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('eventDetail.typeSection')}</Text>
      <View style={styles.typeRow}>
        {EDITABLE_EVENT_TYPES.map((eventType) => {
          const isSelected = event.eventType === eventType;

          return (
            <Pressable
              key={eventType}
              accessibilityRole="button"
              disabled={detail.isSaving}
              style={[styles.typeChip, isSelected && styles.typeChipSelected]}
              onPress={() => void detail.saveUpdate({ eventType })}
            >
              <Text
                style={[
                  styles.typeChipText,
                  isSelected && styles.typeChipTextSelected,
                ]}
              >
                {formatEventType(eventType)}
              </Text>
            </Pressable>
          );
        })}
        {event.eventType === 'unknown' ? (
          <View style={[styles.typeChip, styles.typeChipSelected]}>
            <Text style={[styles.typeChipText, styles.typeChipTextSelected]}>
              {formatEventType('unknown')}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>{t('eventDetail.captionSection')}</Text>
      <TextInput
        editable={!detail.isSaving}
        multiline
        placeholder={t('eventDetail.captionPlaceholder')}
        placeholderTextColor={colors.textMuted}
        style={styles.captionInput}
        value={captionDraft}
        onChangeText={setCaptionDraft}
        onEndEditing={() => {
          const trimmed = captionDraft.trim();
          const nextCaption = trimmed.length > 0 ? trimmed : null;

          if (nextCaption === event.caption) {
            return;
          }

          void detail.saveUpdate({ caption: nextCaption });
        }}
      />
      <Text style={styles.captionHint}>
        {event.caption
          ? t('eventDetail.captionEditHint')
          : t('eventDetail.captionPlaceholderHint')}
      </Text>

      {detail.isSaving ? (
        <Text style={styles.savingText}>{t('common.saving')}</Text>
      ) : null}
      {detail.errorMessage ? (
        <Text style={styles.errorText}>{detail.errorMessage}</Text>
      ) : null}
    </ScrollView>
  );
}

function GalleryImage({
  isHero,
  media,
}: {
  isHero: boolean;
  media: TimelineEventMedia;
}) {
  return (
    <View style={styles.galleryImageFrame}>
      <Image
        accessibilityLabel={
          isHero
            ? t('accessibility.primaryMomentPhoto')
            : t('accessibility.momentPhoto')
        }
        contentFit="cover"
        source={{ uri: media.uri }}
        style={isHero ? styles.heroImage : styles.galleryImage}
      />
      <MediaDetectionDebugBadge media={media} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  centeredText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backLink: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteAction: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    marginTop: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  timestamp: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 15,
  },
  gallery: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  galleryImageFrame: {
    position: 'relative',
  },
  heroImage: {
    aspectRatio: 0.92,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  galleryImage: {
    aspectRatio: 1.2,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  typeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  typeChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  typeChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  typeChipTextSelected: {
    color: colors.surface,
  },
  captionInput: {
    marginTop: spacing.sm,
    minHeight: 112,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  captionHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  savingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    marginTop: spacing.md,
    color: '#8A3A2B',
    fontSize: 14,
    lineHeight: 20,
  },
});
