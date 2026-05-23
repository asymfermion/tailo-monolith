import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { getTabScreenTopPadding } from '@/navigation/modalHeaderInset';
import { useTabBarContentInset } from '@/navigation/useTabBarInsets';
import { PetProfileEditor } from '@/modules/pets/components/PetProfileEditor';
import { useLocalPetProfile } from '@/modules/pets/useLocalPetProfile';

function createPetProfileScreenStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 28,
      fontWeight: '600' as const,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: spacing.lg,
      padding: spacing.lg,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 17,
      fontWeight: '600' as const,
    },
    body: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      marginTop: spacing.sm,
    },
    comingSoon: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: spacing.md,
    },
  };
}

export function PetProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarContentInset = useTabBarContentInset();
  const petProfile = useLocalPetProfile();
  const [askTailoOpen, setAskTailoOpen] = useState(false);
  const styles = useThemedStyles(createPetProfileScreenStyles);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: tabBarContentInset,
          paddingTop: getTabScreenTopPadding(insets.top),
        },
      ]}
      contentInsetAdjustmentBehavior="never"
      style={styles.screen}
    >
      <Text style={styles.title}>{t('navigation.tabs.PetProfile')}</Text>
      <Text style={styles.subtitle}>{t('petProfile.screenSubtitle')}</Text>

      <PetProfileEditor
        isLoading={petProfile.isLoading}
        profile={petProfile.profile}
      />

      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAskTailoOpen((open) => !open)}
        >
          <Text style={styles.sectionTitle}>{t('petProfile.askTailo')}</Text>
        </Pressable>
        <Text style={styles.body}>{t('petProfile.askTailoBody')}</Text>
        {askTailoOpen ? (
          <Text style={styles.comingSoon}>{t('petProfile.askTailoSoon')}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
