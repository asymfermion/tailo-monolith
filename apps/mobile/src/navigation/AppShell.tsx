import { useMemo, useReducer } from 'react';
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
import { HomeScreen } from '@/screens/HomeScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

import { INITIAL_ROUTE_NAME } from './routes';
import { createInitialStack, navigationReducer } from './stack';

export function AppShell() {
  const onboardingSession = useOnboardingSession();
  const initialStack = useMemo(
    () => createInitialStack(INITIAL_ROUTE_NAME),
    [],
  );
  const [stack] = useReducer(navigationReducer, initialStack);
  const activeRoute = stack.at(-1);

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
          renderRoute(activeRoute?.name)
        )}
      </View>
    </SafeAreaView>
  );
}

function renderRoute(routeName: typeof INITIAL_ROUTE_NAME | undefined) {
  switch (routeName) {
    case 'Home':
    default:
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
