import { useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { getDatabase } from '@/db';
import {
  createInAppCaptureEvent,
  persistCaptureImage,
} from '@/modules/capture';
import {
  loadLocalPetProfile,
  saveLocalPetProfilePhoto,
} from '@/modules/pets/petProfile';
import { useNavigation } from '@/navigation/NavigationContext';
import type { CapturePurpose } from '@/navigation/routes';

type CapturePreviewScreenProps = {
  tempUri: string;
  width: number;
  height: number;
  purpose?: CapturePurpose;
};

function createCapturePreviewScreenStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    preview: {
      flex: 1,
      backgroundColor: colors.border,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
      backgroundColor: colors.surface,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 20,
      fontWeight: '600' as const,
    },
    message: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row' as const,
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    primaryButton: {
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
      minHeight: 48,
      borderRadius: 8,
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    secondaryButton: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    error: {
      color: colors.destructive,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
  };
}

export function CapturePreviewScreen({
  tempUri,
  width,
  height,
  purpose = 'timelineMoment',
}: CapturePreviewScreenProps) {
  const navigation = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { colors } = useAppearance();
  const styles = useThemedStyles(createCapturePreviewScreenStyles);

  return (
    <View style={styles.container}>
      <Image
        accessibilityLabel={t('accessibility.capturedPreview')}
        contentFit="contain"
        source={{ uri: tempUri }}
        style={styles.preview}
      />

      <View style={styles.footer}>
        <Text style={styles.title}>{t('capture.previewTitle')}</Text>
        <Text style={styles.message}>
          {purpose === 'petProfilePhoto'
            ? t('petProfile.photoPreviewMessage')
            : t('capture.previewMessage')}
        </Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            style={styles.secondaryButton}
            onPress={navigation.pop}
          >
            <Text style={styles.secondaryButtonText}>
              {t('capture.retake')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            style={[
              styles.primaryButton,
              isSaving && styles.primaryButtonDisabled,
            ]}
            onPress={() => {
              void handleConfirm();
            }}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {purpose === 'petProfilePhoto'
                  ? t('petProfile.usePhoto')
                  : t('capture.addToTimeline')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  async function handleConfirm() {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (purpose === 'petProfilePhoto') {
        const profile = await loadLocalPetProfile();

        if (!profile) {
          throw new Error(t('petProfile.emptyState'));
        }

        const persisted = await persistCaptureImage(tempUri);

        await saveLocalPetProfilePhoto(profile, {
          profilePhotoLocalAssetId: persisted.localAssetId,
          profilePhotoUri: persisted.uri,
        });

        navigation.pop();
        navigation.pop();
        return;
      }

      const persisted = await persistCaptureImage(tempUri);
      const database = await getDatabase();

      await createInAppCaptureEvent(database, {
        ...persisted,
        width,
        height,
      });

      navigation.completeCapture();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('errors.couldNotSaveMoment'),
      );
    } finally {
      setIsSaving(false);
    }
  }
}
