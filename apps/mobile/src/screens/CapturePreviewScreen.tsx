import { useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { getDatabase } from '@/db';
import {
  createInAppCaptureEvent,
  persistCaptureImage,
} from '@/modules/capture';
import { useNavigation } from '@/navigation/NavigationContext';

type CapturePreviewScreenProps = {
  tempUri: string;
  width: number;
  height: number;
};

export function CapturePreviewScreen({
  tempUri,
  width,
  height,
}: CapturePreviewScreenProps) {
  const navigation = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        <Text style={styles.message}>{t('capture.previewMessage')}</Text>
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
            style={styles.primaryButton}
            onPress={() => {
              void handleConfirm();
            }}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('capture.addToTimeline')}
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

const styles = StyleSheet.create({
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
    fontSize: 20,
    fontWeight: '600',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: '#8A3A2B',
    fontSize: 14,
    lineHeight: 20,
  },
});
