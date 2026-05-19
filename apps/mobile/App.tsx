import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors, spacing } from '@/constants/theme';
import { getDatabase } from '@/db';
import {
  bootstrapAuthSession,
  linkLegacyAnonymousUserIfNeeded,
} from '@/modules/auth';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets';
import { runUploadQueueWorker } from '@/modules/sync';
import { AppShell } from '@/navigation/AppShell';

type StartupState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

export default function App() {
  const [startupState, setStartupState] = useState<StartupState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    async function prepareApp() {
      try {
        const [database, authResult] = await Promise.all([
          getDatabase(),
          bootstrapAuthSession(),
        ]);

        if (authResult.status === 'ready') {
          await linkLegacyAnonymousUserIfNeeded();
          await syncRemotePetProfileIfNeeded();
          void runUploadQueueWorker(database);
        }

        if (isMounted) {
          setStartupState({ status: 'ready' });
        }
      } catch (error) {
        if (isMounted) {
          setStartupState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to prepare local storage.',
          });
        }
      }
    }

    prepareApp();

    return () => {
      isMounted = false;
    };
  }, []);

  if (startupState.status === 'loading') {
    return <StartupScreen />;
  }

  if (startupState.status === 'error') {
    return (
      <StartupScreen
        errorMessage={startupState.message}
        onRetry={() => {
          setStartupState({ status: 'loading' });
          void Promise.all([getDatabase(), bootstrapAuthSession()])
            .then(async ([, authResult]) => {
              if (authResult.status === 'ready') {
                await linkLegacyAnonymousUserIfNeeded();
                await syncRemotePetProfileIfNeeded();
              }

              setStartupState({ status: 'ready' });
            })
            .catch((error: unknown) => {
              setStartupState({
                status: 'error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Unable to prepare local storage.',
              });
            });
        }}
      />
    );
  }

  return <AppShell />;
}

type StartupScreenProps = {
  errorMessage?: string;
  onRetry?: () => void;
};

function StartupScreen({ errorMessage, onRetry }: StartupScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {errorMessage ? (
          <>
            <Text style={styles.title}>Tailo needs a moment</Text>
            <Text style={styles.message}>{errorMessage}</Text>
            {onRetry ? (
              <Pressable style={styles.button} onPress={onRetry}>
                <Text style={styles.buttonText}>Try again</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.message}>Preparing your local timeline...</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
});
