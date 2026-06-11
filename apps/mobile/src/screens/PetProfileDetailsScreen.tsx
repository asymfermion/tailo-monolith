import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useAppearance } from '@/lib/appearance';
import { PetProfileEditor } from '@/modules/pets/components/PetProfileEditor';
import { useLocalPetProfile } from '@/modules/pets/useLocalPetProfile';
import { useNavigation } from '@/navigation/NavigationContext';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';

export function PetProfileDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const petProfile = useLocalPetProfile();
  const { colors, getFontFamily } = useAppearance();

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
      <View style={styles.backButtonRow}>
        <ModalBackButton align="leading" onPress={navigation.pop} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: getFontFamily('600'),
            },
          ]}
        >
          {t('petProfile.detailsTitle')}
        </Text>

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
  backButtonRow: {
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
});
