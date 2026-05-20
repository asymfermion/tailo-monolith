import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

import { MainTabBar } from './components/MainTabBar';
import { MainTabPager } from './components/MainTabPager';
import { useNavigation } from './NavigationContext';

export function MainTabShell() {
  const navigation = useNavigation();

  return (
    <View style={styles.shell}>
      <MainTabPager
        activeTab={navigation.activeTab}
        onSelectTab={navigation.setActiveTab}
      />
      <MainTabBar
        activeTab={navigation.activeTab}
        onSelectTab={navigation.setActiveTab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
