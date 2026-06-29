import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { t } from '@/i18n';
import { loadLocalPetProfile } from '@/modules/pets/petProfile';
import { PetPortraitPlaceholder } from '@/components/PetPortraitPlaceholder';

const wordmarkSource = require('../assets/auth/tailo-wordmark-dark-transparent.png');
const ENTRY_DURATION = 500;
const DOT_INTERVAL = 400;
const DOT_COUNT = 3;

function createStyles({ colors, getFontFamily }: AppearanceContextValue) {
  return {
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    layout: {
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
    },
    wordmark: {
      height: 72,
      width: 168,
    },
    halo: {
      alignItems: 'center' as const,
      backgroundColor: '#F5EDD8',
      borderRadius: 103.5,
      height: 207,
      justifyContent: 'center' as const,
      marginTop: 14,
      shadowColor: '#D4A96A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 22,
    },
    portrait: {
      borderRadius: 72.5,
      height: 145,
      overflow: 'hidden' as const,
      width: 145,
    },
    dotsRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginTop: 11,
      width: 85,
    },
    dot: {
      borderRadius: 5,
      height: 9,
      width: 9,
    },
    label: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: 18,
    },
  };
}

export function AppLoadingScreen() {
  const { colors, statusBarStyle } = useAppearance();
  const styles = useThemedStyles(createStyles);

  const [activeDot, setActiveDot] = useState(-1);
  const [petProfile, setPetProfile] = useState<{
    name: string | null;
    portraitUri: string | null;
  }>({ name: null, portraitUri: null });
  const [portraitLoadFailed, setPortraitLoadFailed] = useState(false);

  const wordmarkOpacity = useRef(new Animated.Value(0.55)).current;
  const portraitOpacity = useRef(new Animated.Value(0)).current;
  const portraitScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    void loadLocalPetProfile().then((profile) => {
      setPetProfile({
        name: profile?.name ?? null,
        portraitUri: profile?.portraitUri ?? null,
      });
    });
  }, []);

  useEffect(() => {
    let dotTimer: ReturnType<typeof setTimeout>;
    let dot = -1;
    let mounted = true;

    Animated.parallel([
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: ENTRY_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(portraitOpacity, {
        toValue: 1,
        duration: ENTRY_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(portraitScale, {
        toValue: 1,
        duration: ENTRY_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished || !mounted) return;

      dot = 0;
      setActiveDot(0);
      function stepDot() {
        dot = (dot + 1) % DOT_COUNT;
        if (mounted) setActiveDot(dot);
        dotTimer = setTimeout(stepDot, DOT_INTERVAL);
      }
      dotTimer = setTimeout(stepDot, DOT_INTERVAL);

      Animated.loop(
        Animated.sequence([
          Animated.timing(portraitScale, {
            toValue: 0.98,
            duration: 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(portraitScale, {
            toValue: 1.035,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(portraitScale, {
            toValue: 0.98,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });

    return () => {
      mounted = false;
      clearTimeout(dotTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadingText =
    petProfile.name !== null
      ? t('startup.openingPetMemories', { name: petProfile.name })
      : t('startup.loading');

  const showPortraitImage =
    petProfile.portraitUri !== null && !portraitLoadFailed;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={statusBarStyle} />
      <View style={styles.layout}>
        <Animated.Image
          source={wordmarkSource}
          style={[
            styles.wordmark,
            { opacity: wordmarkOpacity, tintColor: colors.text },
          ]}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={t('common.appName')}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.halo}>
          <Animated.View
            style={{
              opacity: portraitOpacity,
              transform: [{ scale: portraitScale }],
            }}
          >
            {showPortraitImage ? (
              <Image
                source={{ uri: petProfile.portraitUri ?? undefined }}
                style={styles.portrait}
                contentFit="cover"
                accessibilityRole="image"
                accessibilityLabel={petProfile.name ?? t('common.appName')}
                onError={() => setPortraitLoadFailed(true)}
              />
            ) : (
              <PetPortraitPlaceholder size={145} />
            )}
          </Animated.View>
        </View>
        <View style={styles.dotsRow}>
          {Array.from({ length: DOT_COUNT }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.text,
                  opacity: activeDot === i ? 1 : 0.2,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.label}>{loadingText}</Text>
      </View>
    </SafeAreaView>
  );
}
