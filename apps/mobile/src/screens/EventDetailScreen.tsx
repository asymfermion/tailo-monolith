import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_TYPES } from '@tailo/shared';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTextInput } from '@/components/AppTextInput';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { formatEventType, formatTimestamp } from '@/lib/formatMoment';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import {
  getModalHeaderHeight,
  getModalHeaderTopInset,
} from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import { MomentActionMenu } from '@/modules/timeline/components/MomentActionMenu';
import { MomentMediaReorderGallery } from '@/modules/timeline/components/MomentMediaReorderGallery';
import { deleteMoment } from '@/modules/timeline/deleteMoment';
import { useEventDetail } from '@/modules/timeline/useEventDetail';
const EDITABLE_EVENT_TYPES = EVENT_TYPES.filter((type) => type !== 'unknown');

type EventDetailScreenProps = {
  localEventId: string;
};

function createEventDetailScreenStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    fixedHeader: {
      backgroundColor: colors.background,
      left: 0,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.lg,
      position: 'absolute' as const,
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
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.background,
    },
    centeredText: {
      marginTop: spacing.md,
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center' as const,
    },
    errorTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    toolbar: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    toolbarActions: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.xs,
    },
    iconButton: {
      alignItems: 'center' as const,
      height: 36,
      justifyContent: 'center' as const,
      width: 36,
    },
    timestamp: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
    },
    sectionLabel: {
      marginTop: spacing.lg,
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    typeRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
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
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
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
      fontFamily: getFontFamily('400'),
      fontSize: 17,
      lineHeight: 24,
      textAlignVertical: 'top' as const,
    },
    captionHint: {
      marginTop: spacing.sm,
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
    },
    errorText: {
      marginTop: spacing.md,
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
  };
}

export function EventDetailScreen({ localEventId }: EventDetailScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = getModalHeaderHeight(insets.top);
  const detail = useEventDetail(localEventId);
  const [captionDraft, setCaptionDraft] = useState('');
  const { colors } = useAppearance();
  const styles = useThemedStyles(createEventDetailScreenStyles);

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

  const handleDeleteMoment = useCallback(() => {
    Alert.alert(
      t('timeline.moment.deleteConfirmTitle'),
      t('timeline.moment.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('timeline.moment.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await deleteMoment(localEventId);

              if (result.ok) {
                navigation.notifyTimelineChanged();
                navigation.pop();
                return;
              }

              Alert.alert(
                t('timeline.moment.deleteFailedTitle'),
                result.errorMessage || t('timeline.moment.deleteFailedMessage'),
              );
            })();
          },
        },
      ],
    );
  }, [localEventId, navigation]);

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

        <MomentMediaReorderGallery
          isSaving={detail.isSaving}
          media={event.media}
          onMove={(localAssetId, direction) =>
            void detail.moveMedia(localAssetId, direction)
          }
        />

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
        <AppTextInput
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
  const { colors } = useAppearance();
  const styles = useThemedStyles(createEventDetailScreenStyles);

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
            <Ionicons
              color={colors.textMuted}
              name="paper-plane-outline"
              size={22}
            />
          </Pressable>
          <MomentActionMenu showEdit={false} onDelete={onDelete} />
        </View>
      </View>
    </View>
  );
}
