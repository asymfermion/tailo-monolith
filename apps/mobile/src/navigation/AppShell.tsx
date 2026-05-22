import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { useSupabaseAuthAutoRefresh } from '@/lib/useSupabaseAuthAutoRefresh';
import { useOnboardingSession } from '@/modules/auth';
import { useBackgroundSync } from '@/modules/sync';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

import { ModalStackLayer } from './components/ModalStackLayer';
import { NavigationProvider, useNavigation } from './NavigationContext';

function createAppShellStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    root: {
      backgroundColor: colors.background,
      flex: 1,
    },
    screen: {
      flex: 1,
    },
    centered: {
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    centeredText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.md,
      textAlign: 'center' as const,
    },
    errorTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
  };
}

export function AppShell() {
  return (
    <NavigationProvider>
      <AppShellContent />
    </NavigationProvider>
  );
}

function AppShellContent() {
  useSupabaseAuthAutoRefresh();
  useBackgroundSync();
  const insets = useSafeAreaInsets();
  const onboardingSession = useOnboardingSession();
  const navigation = useNavigation();
  const activeModal = navigation.modalStack.at(-1);
  const { statusBarStyle } = useAppearance();
  const styles = useThemedStyles(createAppShellStyles);

  return (
    <View
      style={[
        styles.root,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <StatusBar style={statusBarStyle} />
      <View style={styles.screen}>
        {onboardingSession.isLoading ? (
          <LoadingState />
        ) : onboardingSession.errorMessage ? (
          <ErrorState message={onboardingSession.errorMessage} />
        ) : !onboardingSession.onboardingState.completed &&
          onboardingSession.anonymousUserId ? (
          <OnboardingScreen
            anonymousUserId={onboardingSession.anonymousUserId}
            onboardingState={onboardingSession.onboardingState}
            onComplete={onboardingSession.completeOnboarding}
            onStepChange={onboardingSession.setOnboardingStep}
          />
        ) : (
          <ModalStackLayer activeModal={activeModal} onPop={navigation.pop} />
        )}
      </View>
    </View>
  );
}

function LoadingState() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createAppShellStyles);

  return (
    <View style={[styles.centered, { paddingTop: insets.top }]}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.centeredText}>Preparing Tailo...</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createAppShellStyles);

  return (
    <View style={[styles.centered, { paddingTop: insets.top }]}>
      <Text style={styles.errorTitle}>Tailo needs a moment</Text>
      <Text style={styles.centeredText}>{message}</Text>
    </View>
  );
}
