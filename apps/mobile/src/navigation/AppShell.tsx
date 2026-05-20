import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';
import { useSupabaseAuthAutoRefresh } from '@/lib/useSupabaseAuthAutoRefresh';
import { useOnboardingSession } from '@/modules/auth';
import { useBackgroundSync } from '@/modules/sync';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

import { ModalStackLayer } from './components/ModalStackLayer';
import { NavigationProvider, useNavigation } from './NavigationContext';

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
          <ModalStackLayer activeModal={activeModal} onPop={navigation.pop} />
        )}
      </View>
    </View>
  );
}

function LoadingState() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.centered, { paddingTop: insets.top }]}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.centeredText}>Preparing Tailo...</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.centered, { paddingTop: insets.top }]}>
      <Text style={styles.errorTitle}>Tailo needs a moment</Text>
      <Text style={styles.centeredText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
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
