import { useCallback } from 'react';
import { View } from 'react-native';

import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';

import { MainTabBar } from './components/MainTabBar';
import { MainTabPager } from './components/MainTabPager';
import { useNavigation } from './NavigationContext';
import type { MainTabId } from './routes';

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

  const handleTabBarSelect = useCallback(
    (tab: MainTabId) => {
      if (tab === 'Timeline' && navigation.activeTab === 'Timeline') {
        navigation.scrollTimelineToTop();
        return;
      }

      navigation.setActiveTab(tab);
    },
    [navigation],
  );

  return (
    <View style={styles.shell}>
      <MainTabPager
        activeTab={navigation.activeTab}
        onSelectTab={navigation.setActiveTab}
      />
      <MainTabBar
        activeTab={navigation.activeTab}
        onSelectTab={handleTabBarSelect}
      />
    </View>
  );
}
