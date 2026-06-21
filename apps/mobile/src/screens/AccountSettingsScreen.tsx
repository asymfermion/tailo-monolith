import {
  ActivityIndicator,
  ScrollView,
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
import { isLinkedRemoteAccount, useAuthAccountStatus } from '@/modules/auth';
import { createAccountSettingsStyles } from '@/modules/auth/components/accountSettingsStyles';
import { useNavigation } from '@/navigation/NavigationContext';

import { UserProfileScreen } from './UserProfileScreen';

type AccountSettingsScreenProps = {
  mode?: 'link' | 'create';
  signInPresentation?: 'pop';
};

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

export function AccountSettingsScreen({
  mode = 'link',
  signInPresentation,
}: AccountSettingsScreenProps) {
  const navigation = useNavigation();
  const account = useAuthAccountStatus();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createAccountSettingsStyles);

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

  return (
    <AccountLayout isCreate={mode === 'create'} onBack={navigation.pop}>
      <UserProfileScreen
        key={`profile-${account.authUserId ?? 'anon'}-${isLinkedRemoteAccount(account.session) ? 'linked' : 'anon'}`}
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
          contentContainerStyle={[
            styles.authContent,
            {
              paddingBottom: insets.bottom + spacing.lg,
              paddingTop: getAuthHeroScrollPaddingTop(insets.top),
            },
          ]}
          contentInsetAdjustmentBehavior="never"
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
        contentContainerStyle={styles.standardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
