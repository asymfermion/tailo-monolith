import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors, spacing } from '@/constants/theme';
import { useOnboardingSession } from '@/modules/auth';
import { useBackgroundSync } from '@/modules/sync';
import { CapturePreviewScreen } from '@/screens/CapturePreviewScreen';
import { CaptureScreen } from '@/screens/CaptureScreen';
import { EventDetailScreen } from '@/screens/EventDetailScreen';
import { AccountSettingsScreen } from '@/screens/AccountSettingsScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

import { NavigationProvider, useNavigation } from './NavigationContext';
import type { RootRoute } from './routes';

export function AppShell() {
  return (
    <NavigationProvider>
      <AppShellContent />
    </NavigationProvider>
  );
}

function AppShellContent() {
  useBackgroundSync();
  const onboardingSession = useOnboardingSession();
  const navigation = useNavigation();
  const activeRoute = navigation.stack.at(-1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
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
          renderRoute(activeRoute)
        )}
      </View>
    </SafeAreaView>
  );
}

function renderRoute(route: RootRoute | undefined) {
  if (!route) {
    return <HomeScreen />;
  }

  switch (route.name) {
    case 'AccountSettings':
      return <AccountSettingsScreen />;
    case 'EventDetail': {
      const localEventId = route.params.localEventId;

      if (!localEventId) {
        return <HomeScreen />;
      }

      return <EventDetailScreen localEventId={localEventId} />;
    }
    case 'Capture':
      return <CaptureScreen />;
    case 'CapturePreview':
      return (
        <CapturePreviewScreen
          height={route.params.height}
          tempUri={route.params.tempUri}
          width={route.params.width}
        />
      );
    case 'Home':
      return <HomeScreen />;
  }
}

function LoadingState() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.centeredText}>Preparing Tailo...</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorTitle}>Tailo needs a moment</Text>
      <Text style={styles.centeredText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  centeredText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
});
