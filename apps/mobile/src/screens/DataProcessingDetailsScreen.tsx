import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';

function createStyles({ colors, getFontFamily }: AppearanceContextValue) {
  return StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    content: {
      flexGrow: 1,
      paddingBottom: spacing.xl,
      paddingTop: spacing.md,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 22,
      fontWeight: '600',
      lineHeight: 28,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    placeholder: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      marginTop: spacing.xl,
      padding: spacing.lg,
    },
    placeholderText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
  });
}

export function DataProcessingDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: getModalHeaderTopInset(insets.top) },
      ]}
    >
      <ModalBackButton align="leading" onPress={navigation.pop} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('settings.dataProcessingTitle')}</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {t('settings.dataProcessingPlaceholder')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
