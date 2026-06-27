import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  getCameraPermissionLabelKey,
  getPhotoPermissionLabelKey,
  type CameraPermissionStatus,
} from '@/lib/devicePermissionLabels';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { useNavigation } from '@/navigation/NavigationContext';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';
import type { PhotoPermissionStatus } from '@/modules/mediaScanner/permissions';
import { checkPhotoLibraryPermission } from '@/modules/mediaScanner/scanner';

function createPrivacyPermissionsStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    header: {
      marginTop: spacing.sm,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 25,
      textAlign: 'center' as const,
    },
    content: {
      flexGrow: 1,
      paddingBottom: spacing.xl,
      paddingTop: spacing.sm,
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: 0.6,
      lineHeight: 16,
      marginBottom: spacing.sm,
      textTransform: 'uppercase' as const,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden' as const,
    },
    rowFrame: {
      position: 'relative' as const,
    },
    row: {
      minHeight: 60,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    rowPressed: {
      backgroundColor: colors.background,
    },
    rowTop: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    rowLabel: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      marginRight: spacing.sm,
    },
    rowStatus: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      textAlign: 'right' as const,
    },
    rowDescription: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
    rowDivider: {
      backgroundColor: colors.border,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      left: 18,
      position: 'absolute' as const,
      right: 18,
    },
    simpleRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      minHeight: 56,
      paddingHorizontal: 18,
    },
    simpleRowLabel: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  };
}

type PrivacyStyles = ReturnType<typeof createPrivacyPermissionsStyles>;

function PermissionRow({
  description,
  isLast = false,
  label,
  onPress,
  statusLabel,
  styles,
}: {
  description: string;
  isLast?: boolean;
  label: string;
  onPress?: () => void;
  statusLabel: string;
  styles: PrivacyStyles;
}) {
  const content = (
    <>
      <View style={styles.rowTop}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowStatus}>{statusLabel}</Text>
      </View>
      <Text style={styles.rowDescription}>{description}</Text>
    </>
  );

  return (
    <View style={styles.rowFrame}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={onPress}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
      {!isLast ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

function PrivacyLinkRow({
  isLast = false,
  label,
  onPress,
  styles,
}: {
  isLast?: boolean;
  label: string;
  onPress: () => void;
  styles: PrivacyStyles;
}) {
  return (
    <View style={styles.rowFrame}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.simpleRow,
          pressed && styles.rowPressed,
        ]}
        onPress={onPress}
      >
        <Text style={styles.simpleRowLabel}>{label}</Text>
        <Ionicons
          color={styles.simpleRowLabel.color as string}
          name="chevron-forward"
          size={20}
          style={{ opacity: 0.4 }}
        />
      </Pressable>
      {!isLast ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

export function PrivacyPermissionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useThemedStyles(createPrivacyPermissionsStyles);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [photoStatus, setPhotoStatus] =
    useState<PhotoPermissionStatus>('checking');

  const refreshPhotoPermission = useCallback(async () => {
    const result = await checkPhotoLibraryPermission();
    setPhotoStatus(result.status);
  }, []);

  useEffect(() => {
    void refreshPhotoPermission();
  }, [refreshPhotoPermission]);

  const cameraStatus: CameraPermissionStatus = !cameraPermission
    ? 'checking'
    : cameraPermission.granted
      ? 'granted'
      : cameraPermission.status === 'undetermined'
        ? 'undetermined'
        : 'denied';

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: getModalHeaderTopInset(insets.top),
        },
      ]}
    >
      <ModalBackButton align="leading" onPress={navigation.pop} />
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('settings.privacyPermissionsTitle')}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.sections.permissions')}
          </Text>
          <View style={styles.sectionCard}>
            <PermissionRow
              description={t('settings.photosPermissionDescription')}
              label={t('settings.photosPermissionLabel')}
              statusLabel={t(getPhotoPermissionLabelKey(photoStatus))}
              styles={styles}
              onPress={openSystemSettings}
            />
            <PermissionRow
              description={t('settings.cameraPermissionDescription')}
              label={t('settings.cameraPermissionLabel')}
              statusLabel={t(getCameraPermissionLabelKey(cameraStatus))}
              styles={styles}
              onPress={() => {
                if (cameraPermission?.granted) {
                  openSystemSettings();
                  return;
                }

                void requestCameraPermission();
              }}
            />
            <PermissionRow
              description={t('settings.notificationsPermissionDescription')}
              isLast
              label={t('settings.notificationsPermissionLabel')}
              statusLabel={t('settings.permissionStatusReview')}
              styles={styles}
              onPress={openSystemSettings}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.sections.privacy')}
          </Text>
          <View style={styles.sectionCard}>
            <PrivacyLinkRow
              label={t('settings.privacyPolicyLabel')}
              styles={styles}
              onPress={() => navigation.push('PrivacyPolicy')}
            />
            <PrivacyLinkRow
              isLast
              label={t('settings.dataProcessingLabel')}
              styles={styles}
              onPress={() => navigation.push('DataProcessingDetails')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
