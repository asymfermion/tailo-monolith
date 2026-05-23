import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardDismissAndroidBar } from '@/components/KeyboardDismissAccessory';
import { spacing } from '@/constants/theme';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { useSupabaseAuthAutoRefresh } from '@/lib/useSupabaseAuthAutoRefresh';
import {
  logAuth,
  useAuthGate,
  useOnboardingSession,
  type AuthGateState,
} from '@/modules/auth';
import { useBackgroundSync } from '@/modules/sync';
import { LoginScreen } from '@/screens/LoginScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

import { ModalStackLayer } from './components/ModalStackLayer';
import { MainTabShell } from './MainTabShell';
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
  const navigation = useNavigation();
  const authGate = useAuthGate();
  const previousRequiresLoginRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (authGate.isLoading) {
      return;
    }

    const wasLoginGate = previousRequiresLoginRef.current === true;

    if (wasLoginGate && !authGate.requiresLogin) {
      logAuth('Login gate cleared — dismissing auth screens');
      navigation.finishSignInToTimeline();
    }

    previousRequiresLoginRef.current = authGate.requiresLogin;
  }, [authGate.isLoading, authGate.requiresLogin, navigation]);

  if (authGate.isLoading) {
    return (
      <AppShellFrame>
        <LoadingState />
      </AppShellFrame>
    );
  }

  if (authGate.requiresLogin) {
    return <LoginAppShell />;
  }

  return <AuthenticatedAppShell authGate={authGate} />;
}

/** Login gate only — avoids onboarding reload re-rendering the sign-in form. */
function LoginAppShell() {
  const navigation = useNavigation();
  const activeModal = navigation.modalStack.at(-1);

  return (
    <AppShellFrame>
      <ModalStackLayer
        activeModal={activeModal}
        onPop={navigation.pop}
        underlay={
          <LoginScreen
            onSignedIn={() => {
              logAuth('Full-screen login UI finished');
            }}
          />
        }
      />
    </AppShellFrame>
  );
}

function AuthenticatedAppShell({ authGate }: { authGate: AuthGateState }) {
  useBackgroundSync(false);
  const onboardingSession = useOnboardingSession();
  const navigation = useNavigation();
  const activeModal = navigation.modalStack.at(-1);

  const showOnboarding =
    !onboardingSession.onboardingState.completed &&
    Boolean(onboardingSession.anonymousUserId);

  const underlay = onboardingSession.isLoading ? (
    <LoadingState />
  ) : onboardingSession.errorMessage ? (
    <ErrorState message={onboardingSession.errorMessage} />
  ) : showOnboarding ? (
    <OnboardingScreen
      anonymousUserId={onboardingSession.anonymousUserId!}
      onboardingState={onboardingSession.onboardingState}
      onComplete={onboardingSession.completeOnboarding}
      onStepChange={onboardingSession.setOnboardingStep}
    />
  ) : (
    <MainTabShell />
  );

  return (
    <AppShellFrame>
      <ModalStackLayer
        activeModal={activeModal}
        onPop={navigation.pop}
        underlay={underlay}
      />
    </AppShellFrame>
  );
}

function AppShellFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
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
        {children}
        <KeyboardDismissAndroidBar />
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
