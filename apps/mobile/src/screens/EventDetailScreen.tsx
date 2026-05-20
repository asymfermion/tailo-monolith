import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_TYPES } from '@tailo/shared';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaDetectionDebugBadge } from '@/components/MediaDetectionDebugBadge';
import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { formatEventType, formatTimestamp } from '@/lib/formatMoment';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import {
  getModalHeaderHeight,
  getModalHeaderTopInset,
} from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import { MomentActionMenu } from '@/modules/timeline/components/MomentActionMenu';
import { useEventDetail } from '@/modules/timeline/useEventDetail';
import type { TimelineEventMedia } from '@/types';

const EDITABLE_EVENT_TYPES = EVENT_TYPES.filter((type) => type !== 'unknown');

type EventDetailScreenProps = {
  localEventId: string;
};

export function EventDetailScreen({ localEventId }: EventDetailScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = getModalHeaderHeight(insets.top);
  const detail = useEventDetail(localEventId);
  const [captionDraft, setCaptionDraft] = useState('');

  useEffect(() => {
    setCaptionDraft(detail.event?.caption ?? '');
  }, [detail.event?.caption, detail.event?.localEventId]);

  // TODO: share-moment — export primary image (and optional caption) to the system share sheet.
  const handleShareMoment = useCallback(() => {
    Alert.alert(
      t('timeline.moment.shareSoonTitle'),
      t('timeline.moment.shareSoonMessage'),
    );
  }, []);

  // TODO: delete-moment — remove from local DB, pop detail, refresh timeline, and sync deletion when account is linked.
  const handleDeleteMoment = useCallback(() => {
    Alert.alert(
      t('timeline.moment.deleteSoonTitle'),
      t('timeline.moment.deleteSoonMessage'),
    );
  }, []);

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
        <ModalBackButton onPress={navigation.pop} />
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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
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

        <Text style={styles.sectionLabel}>
          {t('eventDetail.captionSection')}
        </Text>
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

        {detail.errorMessage ? (
          <Text style={styles.errorText}>{detail.errorMessage}</Text>
        ) : null}
      </ScrollView>

      <EventDetailToolbar
        isFavorite={event.isFavorite}
        isSaving={detail.isSaving}
        onBack={navigation.pop}
        onDelete={handleDeleteMoment}
        onShare={handleShareMoment}
        onToggleFavorite={() =>
          void detail.saveUpdate({ isFavorite: !event.isFavorite })
        }
        topInset={getModalHeaderTopInset(insets.top)}
      />
    </View>
  );
}

type EventDetailToolbarProps = {
  isFavorite: boolean;
  isSaving: boolean;
  onBack: () => void;
  onDelete: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
  topInset: number;
};

function EventDetailToolbar({
  isFavorite,
  isSaving,
  onBack,
  onDelete,
  onShare,
  onToggleFavorite,
  topInset,
}: EventDetailToolbarProps) {
  return (
    <View style={[styles.fixedHeader, { paddingTop: topInset }]}>
      <View style={styles.toolbar}>
        <ModalBackButton align="leading" onPress={onBack} />
        <View style={styles.toolbarActions}>
          <Pressable
            accessibilityLabel={
              isFavorite
                ? t('timeline.moment.removeFavorite')
                : t('timeline.moment.addFavorite')
            }
            accessibilityRole="button"
            disabled={isSaving}
            hitSlop={8}
            style={styles.iconButton}
            onPress={onToggleFavorite}
          >
            <Ionicons
              color={isFavorite ? colors.accent : colors.textMuted}
              name={isFavorite ? 'star' : 'star-outline'}
              size={24}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={t('timeline.moment.share')}
            accessibilityRole="button"
            disabled={isSaving}
            hitSlop={8}
            style={styles.iconButton}
            onPress={onShare}
          >
            <Ionicons color={colors.textMuted} name="share-outline" size={22} />
          </Pressable>
          <MomentActionMenu showEdit={false} onDelete={onDelete} />
        </View>
      </View>
    </View>
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
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  fixedHeader: {
    backgroundColor: colors.background,
    left: 0,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
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
  toolbarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  timestamp: {
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
  errorText: {
    marginTop: spacing.md,
    color: '#8A3A2B',
    fontSize: 14,
    lineHeight: 20,
  },
});
