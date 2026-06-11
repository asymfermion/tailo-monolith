import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import {
  AppearanceProvider,
  useAppFonts,
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { configureTextAccessibility } from '@/lib/configureTextAccessibility';
import { logTailo } from '@/lib/tailoLogger';
import { hydrateAppFontStyle } from '@/lib/appFontStyle';
import { hydrateAppTheme } from '@/lib/appTheme';
import { getDatabase } from '@/db';
import { countPendingUploadQueueItems } from '@/db/uploadQueue';
import { hydrateAppLocale, t, useAppLocale } from '@/i18n';
import { prepareAppRemoteAuth } from '@/modules/auth';
import { syncRemotePetProfileIfNeeded } from '@/modules/pets';
import {
  hydrateCloudImageUploadsEnabled,
  runPendingCloudSync,
  runUploadQueueWorker,
} from '@/modules/sync';
import { AppShell } from '@/navigation/AppShell';

configureTextAccessibility();

type StartupState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

function createStartupStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    container: {
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    message: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 16,
      lineHeight: 23,
      marginTop: spacing.md,
      textAlign: 'center' as const,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    buttonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
  };
}

export default function App() {
  useAppLocale();
  const fontsLoaded = useAppFonts();
  const [startupState, setStartupState] = useState<StartupState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    async function prepareApp() {
      try {
        await getDatabase();
        await Promise.all([
          hydrateAppLocale(),
          hydrateAppTheme(),
          hydrateAppFontStyle(),
          hydrateCloudImageUploadsEnabled(),
        ]);
        const authResult = await prepareAppRemoteAuth();

        if (
          authResult.status === 'ready' ||
          authResult.status === 'logged_out'
        ) {
          if (authResult.status === 'ready') {
            await syncRemotePetProfileIfNeeded();
            const database = await getDatabase();
            const pendingCloudUploadCount =
              await countPendingUploadQueueItems(database);

            logTailo('App', 'Startup cloud upload worker triggered', {
              pendingCloudUploadCount,
              note:
                pendingCloudUploadCount > 0
                  ? 'Draining upload_queue from prior promotions'
                  : 'No pending uploads; worker exits quickly',
            });
            void runUploadQueueWorker(database).then(() =>
              runPendingCloudSync(database),
            );
          }
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

  if (!fontsLoaded || startupState.status === 'loading') {
    return (
      <AppearanceProvider>
        <StartupScreen />
      </AppearanceProvider>
    );
  }

  if (startupState.status === 'error') {
    return (
      <AppearanceProvider>
        <StartupScreen
          errorMessage={startupState.message}
          onRetry={() => {
            setStartupState({ status: 'loading' });
            void (async () => {
              await getDatabase();
              await Promise.all([
                hydrateAppLocale(),
                hydrateAppTheme(),
                hydrateAppFontStyle(),
                hydrateCloudImageUploadsEnabled(),
              ]);
              const authResult = await prepareAppRemoteAuth();
              if (
                authResult.status === 'ready' ||
                authResult.status === 'logged_out'
              ) {
                if (authResult.status === 'ready') {
                  await syncRemotePetProfileIfNeeded();
                }
              }

              setStartupState({ status: 'ready' });
            })().catch((error: unknown) => {
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
      </AppearanceProvider>
    );
  }

  return (
    <AppearanceProvider>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </AppearanceProvider>
  );
}

type StartupScreenProps = {
  errorMessage?: string;
  onRetry?: () => void;
};

function StartupScreen({ errorMessage, onRetry }: StartupScreenProps) {
  const { colors, statusBarStyle } = useAppearance();
  const styles = useThemedStyles(createStartupStyles);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={statusBarStyle} />
      <View style={styles.container}>
        {errorMessage ? (
          <>
            <Text style={styles.title}>{t('startup.errorTitle')}</Text>
            <Text style={styles.message}>{errorMessage}</Text>
            {onRetry ? (
              <Pressable style={styles.button} onPress={onRetry}>
                <Text style={styles.buttonText}>{t('startup.retry')}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.message}>{t('startup.loading')}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
