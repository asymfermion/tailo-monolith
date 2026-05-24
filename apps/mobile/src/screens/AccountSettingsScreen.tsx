import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useAppearance, useThemedStyles } from '@/lib/appearance';
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
      <AccountLayout onBack={navigation.pop}>
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
      <AccountLayout onBack={navigation.pop}>
        <Text style={styles.body}>{t('account.unavailableBody')}</Text>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout onBack={navigation.pop}>
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
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: getModalHeaderTopInset(insets.top),
      }}
    >
      <ModalBackButton align="leading" onPress={onBack} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
