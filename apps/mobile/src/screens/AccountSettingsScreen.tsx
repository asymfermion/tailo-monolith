import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHeroCollage } from '@/components/AuthBranding';
import { AuthBackButtonOverlay } from '@/components/AuthHeader';
import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  getAuthHeroScrollPaddingTop,
  getWelcomeLayoutMetrics,
} from '@/lib/authWelcomeLayout';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';
import {
  isLinkedRemoteAccount,
  resetLocalDeviceData,
  useAuthAccountStatus,
  useAuthGate,
} from '@/modules/auth';
import { ConnectedAccountProfileForm } from '@/modules/auth/components/ConnectedAccountProfileForm';
import { createAccountSettingsStyles } from '@/modules/auth/components/accountSettingsStyles';
import { useRemoteAccountProfile } from '@/modules/auth/useRemoteAccountProfile';
import { useNavigation } from '@/navigation/NavigationContext';

import { UserProfileScreen } from './UserProfileScreen';

type AccountSettingsScreenProps = {
  mode?: 'link' | 'create';
  signInPresentation?: 'pop';
};

type EditSubview = 'profile' | 'password';

function getInitials(displayName: string | null, email: string | null): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.trim()[0].toUpperCase();
  }
  if (email) {
    const local = email.split('@')[0];
    return local.slice(0, 2).toUpperCase();
  }
  return '?';
}

function createAccountLayoutStyles({ colors }: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    authContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
    },
    authShell: {
      alignSelf: 'center' as const,
      maxWidth: 520,
      width: '100%' as const,
    },
    authHero: {
      alignSelf: 'center' as const,
    },
    standardScreen: {
      backgroundColor: colors.background,
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    standardContent: {
      flexGrow: 1,
      paddingBottom: spacing.lg,
      paddingTop: spacing.md,
    },
  };
}

function createLinkedAccountStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    content: {
      flexGrow: 1,
      paddingBottom: spacing.xl,
      paddingTop: spacing.md,
    },
    pageTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 32,
      textAlign: 'center',
    },
    pageSubtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      lineHeight: 16,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
    },
    profileRow: {
      alignItems: 'center',
      flexDirection: 'row',
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 12,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.border,
      borderRadius: 32,
      height: 64,
      justifyContent: 'center',
      marginRight: spacing.md,
      width: 64,
    },
    avatarInitials: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 24,
    },
    profileInfo: {
      flex: 1,
      minWidth: 0,
    },
    profileName: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    profileEmail: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: 2,
    },
    editButton: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 14,
      justifyContent: 'center',
      marginBottom: 12,
      marginHorizontal: 18,
      minHeight: 44,
    },
    editButtonPressed: {
      opacity: 0.7,
    },
    editButtonText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
    },
    rowFrame: {
      position: 'relative',
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 56,
      paddingHorizontal: 18,
    },
    rowPressed: {
      backgroundColor: colors.background,
    },
    rowLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
    },
    rowValue: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    rowDivider: {
      backgroundColor: colors.border,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      left: 18,
      position: 'absolute',
      right: 18,
    },
    chevronWrap: {
      alignItems: 'center',
      height: 20,
      justifyContent: 'center',
      marginLeft: spacing.sm,
      width: 20,
    },
    destructiveLabel: {
      color: colors.destructive,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 20,
    },
  });
}

export function AccountSettingsScreen({
  mode = 'link',
  signInPresentation,
}: AccountSettingsScreenProps) {
  const navigation = useNavigation();
  const account = useAuthAccountStatus();
  const authGate = useAuthGate();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createAccountSettingsStyles);
  const [editSubview, setEditSubview] = useState<EditSubview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLinked = isLinkedRemoteAccount(account.session);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('account.deleteAccountConfirmTitle'),
      t('account.deleteAccountConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.deleteAccountConfirmButton'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setIsDeleting(true);
              try {
                await resetLocalDeviceData({ deleteRemoteAccount: true });
                navigation.pop();
                await authGate.refresh();
                await account.refresh();
              } catch (error) {
                Alert.alert(
                  t('account.deleteAccountFailedTitle'),
                  error instanceof Error
                    ? error.message
                    : t('account.deleteAccountFailedMessage'),
                );
              } finally {
                setIsDeleting(false);
              }
            })();
          },
        },
      ],
    );
  }, [account, authGate, navigation]);

  if (account.isLoading) {
    return (
      <AccountLayout isCreate={mode === 'create'} onBack={navigation.pop}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator color={colors.accent} />
        </View>
      </AccountLayout>
    );
  }

  if (!account.isConfigured) {
    return (
      <AccountLayout isCreate={mode === 'create'} onBack={navigation.pop}>
        <Text style={styles.body}>{t('account.unavailableBody')}</Text>
      </AccountLayout>
    );
  }

  // Auth flows: create mode or link mode for unlinked users
  if (mode === 'create' || !isLinked) {
    return (
      <AccountLayout isCreate={mode === 'create'} onBack={navigation.pop}>
        <UserProfileScreen
          key={`profile-${account.authUserId ?? 'anon'}-${isLinked ? 'linked' : 'anon'}`}
          mode={mode}
          signInPresentation={signInPresentation}
          onAnonymousLinked={() => {
            void (async () => {
              await account.refresh();
              navigation.pop();
            })();
          }}
        />
      </AccountLayout>
    );
  }

  // Edit subview for linked accounts
  if (editSubview) {
    return (
      <AccountLayout isCreate={false} onBack={() => setEditSubview(null)}>
        <ConnectedAccountProfileForm
          mode="link"
          preferPasswordSetup={editSubview === 'password'}
        />
      </AccountLayout>
    );
  }

  // Linked account overview (Figma design)
  return (
    <LinkedAccountView
      account={account}
      isDeleting={isDeleting}
      onBack={navigation.pop}
      onChangePassword={() => setEditSubview('password')}
      onDeleteAccount={handleDeleteAccount}
      onEditProfile={() => setEditSubview('profile')}
    />
  );
}

function LinkedAccountView({
  account,
  isDeleting,
  onBack,
  onChangePassword,
  onDeleteAccount,
  onEditProfile,
}: {
  account: ReturnType<typeof useAuthAccountStatus>;
  isDeleting: boolean;
  onBack: () => void;
  onChangePassword: () => void;
  onDeleteAccount: () => void;
  onEditProfile: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createLinkedAccountStyles);
  const { profile } = useRemoteAccountProfile();

  const displayName = profile?.displayName ?? null;
  const email = account.session?.email ?? null;
  const emailConfirmed = account.session?.emailConfirmed ?? false;
  const initials = getInitials(displayName, email);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: getModalHeaderTopInset(insets.top) },
      ]}
    >
      <ModalBackButton align="leading" onPress={onBack} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{t('account.settingsTitle')}</Text>
        <Text style={styles.pageSubtitle}>{t('account.settingsSubtitle')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account.sectionProfile')}</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                {displayName ? (
                  <Text numberOfLines={1} style={styles.profileName}>
                    {displayName}
                  </Text>
                ) : null}
                {email ? (
                  <Text numberOfLines={1} style={styles.profileEmail}>
                    {email}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.editButtonPressed,
              ]}
              onPress={onEditProfile}
            >
              <Text style={styles.editButtonText}>
                {t('settings.editAccountProfileLabel')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('account.sectionSecurity')}
          </Text>
          <View style={styles.card}>
            <View style={styles.rowFrame}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>
                  {t('account.profileEmailLabel')}
                </Text>
                <Text style={styles.rowValue}>
                  {emailConfirmed
                    ? t('account.emailVerifiedLabel')
                    : t('account.emailUnverifiedLabel')}
                </Text>
              </View>
              <View style={styles.rowDivider} />
            </View>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
              onPress={onChangePassword}
            >
              <Text style={styles.rowLabel}>{t('account.passwordLabel')}</Text>
              <Text style={styles.rowValue}>
                {t('account.passwordChangeLabel')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account.sectionAccount')}</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              disabled={isDeleting}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
              onPress={onDeleteAccount}
            >
              <Text style={styles.destructiveLabel}>
                {t('account.deleteAccountLabel')}
              </Text>
              <View style={styles.chevronWrap}>
                <Ionicons
                  color={colors.destructive}
                  name="chevron-forward"
                  size={20}
                />
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AccountLayout({
  children,
  isCreate,
  onBack,
}: {
  children: React.ReactNode;
  isCreate: boolean;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const styles = useThemedStyles(createAccountLayoutStyles);
  const availableHeight = Math.max(height - insets.top - insets.bottom, 0);
  const heroLayoutMetrics = getWelcomeLayoutMetrics(height, availableHeight);

  if (isCreate) {
    return (
      <View style={styles.screen}>
        <AuthBackButtonOverlay onBack={onBack} />
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[
            styles.authContent,
            {
              paddingBottom: insets.bottom + spacing.lg,
              paddingTop: getAuthHeroScrollPaddingTop(insets.top),
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.screen}
        >
          <AuthHeroCollage
            maxHeight={heroLayoutMetrics.heroMaxHeight}
            variant="onboarding"
            style={[
              styles.authHero,
              { marginBottom: heroLayoutMetrics.heroToContentGap },
            ]}
          />
          <View style={styles.authShell}>{children}</View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.standardScreen,
        { paddingTop: getModalHeaderTopInset(insets.top) },
      ]}
    >
      <ModalBackButton align="leading" onPress={onBack} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.standardContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
