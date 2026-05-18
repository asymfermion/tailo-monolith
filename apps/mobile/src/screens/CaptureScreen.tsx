import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraView as CameraViewInstance } from 'expo-camera';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useNavigation } from '@/navigation/NavigationContext';

export function CaptureScreen() {
  const navigation = useNavigation();
  const cameraRef = useRef<CameraViewInstance>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('capture.cameraTitle')}</Text>
        <Text style={styles.message}>{t('capture.cameraMessage')}</Text>
        {permission.canAskAgain ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => void requestPermission()}
          >
            <Text style={styles.primaryButtonText}>
              {t('capture.allowCamera')}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.message}>{t('capture.cameraDenied')}</Text>
        )}
        <Pressable onPress={navigation.pop}>
          <Text style={styles.backLink}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} facing="back" style={styles.camera} />
      <View style={styles.overlay}>
        <Pressable onPress={navigation.pop}>
          <Text style={styles.backLink}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={styles.hint}>{t('capture.hint')}</Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={isCapturing}
          style={styles.shutterButton}
          onPress={() => {
            void handleCapture();
          }}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);
    setErrorMessage(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });

      if (!photo?.uri) {
        throw new Error(t('errors.couldNotCapturePhoto'));
      }

      navigation.push('CapturePreview', {
        tempUri: photo.uri,
        width: photo.width,
        height: photo.height,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('errors.couldNotCapturePhoto'),
      );
    } finally {
      setIsCapturing(false);
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
  },
  backLink: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  shutterButton: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  error: {
    color: '#FFD5CC',
    fontSize: 14,
    textAlign: 'center',
  },
});
