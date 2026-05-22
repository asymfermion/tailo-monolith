import { View } from 'react-native';

import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

import { MainTabBar } from './components/MainTabBar';
import { MainTabPager } from './components/MainTabPager';
import { useNavigation } from './NavigationContext';

function createMainTabShellStyles({ colors }: AppearanceContextValue) {
  return {
    shell: {
      backgroundColor: colors.background,
      flex: 1,
    },
  };
}

export function MainTabShell() {
  const navigation = useNavigation();
  const styles = useThemedStyles(createMainTabShellStyles);

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
