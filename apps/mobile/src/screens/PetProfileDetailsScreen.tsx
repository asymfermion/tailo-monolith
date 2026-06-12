import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useAppearance } from '@/lib/appearance';
import { PetProfileEditor } from '@/modules/pets/components/PetProfileEditor';
import { useLocalPetProfile } from '@/modules/pets/useLocalPetProfile';
import { useNavigation } from '@/navigation/NavigationContext';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';

export function PetProfileDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const petProfile = useLocalPetProfile();
  const { colors, getFontFamily } = useAppearance();
  const previousModalDepthRef = useRef(navigation.modalStack.length);
  const modalDepth = navigation.modalStack.length;
  const refreshProfile = petProfile.refresh;

  useEffect(() => {
    const previousModalDepth = previousModalDepthRef.current;
    const currentModalDepth = modalDepth;

    previousModalDepthRef.current = currentModalDepth;

    if (previousModalDepth <= currentModalDepth) {
      return;
    }

    void refreshProfile();
  }, [modalDepth, refreshProfile]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: getModalHeaderTopInset(insets.top),
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={navigation.pop}
        >
          <Text
            style={[
              styles.headerAction,
              {
                color: colors.accent,
                fontFamily: getFontFamily('500'),
              },
            ]}
          >
            {t('common.cancel')}
          </Text>
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.text,
              fontFamily: getFontFamily('600'),
            },
          ]}
        >
          {petProfile.profile?.name
            ? t('petProfile.editNamedPet', { name: petProfile.profile.name })
            : t('petProfile.detailsTitle')}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={navigation.pop}
        >
          <Text
            style={[
              styles.headerAction,
              {
                color: colors.accent,
                fontFamily: getFontFamily('500'),
              },
            ]}
          >
            {t('common.done')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <PetProfileEditor
          isLoading={petProfile.isLoading}
          profile={petProfile.profile}
          onProfileSaved={petProfile.refresh}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  headerAction: {
    fontSize: 15,
    minWidth: 56,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
