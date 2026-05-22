import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useThemedStyles, type AppearanceContextValue } from '@/lib/appearance';
import { PetProfileScreen } from '@/screens/PetProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TimelineScreen } from '@/screens/TimelineScreen';

import { getMainTabFromIndex, getMainTabIndex } from '../mainTabPager';
import { MAIN_TAB_ORDER, type MainTabId } from '../routes';

type MainTabPagerProps = {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
};

function createMainTabPagerStyles({ colors }: AppearanceContextValue) {
  return {
    pager: {
      backgroundColor: colors.background,
      flex: 1,
    },
    page: {
      backgroundColor: colors.background,
      flex: 1,
    },
  };
}

export function MainTabPager({ activeTab, onSelectTab }: MainTabPagerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const activeTabRef = useRef(activeTab);
  const didInitialScrollRef = useRef(false);
  const skipTabSyncRef = useRef(false);
  const styles = useThemedStyles(createMainTabPagerStyles);

  activeTabRef.current = activeTab;

  useEffect(() => {
    if (pageWidth === 0) {
      return;
    }

    const index = getMainTabIndex(activeTab);

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      scrollRef.current?.scrollTo({ animated: false, x: index * pageWidth });
      return;
    }

    if (skipTabSyncRef.current) {
      skipTabSyncRef.current = false;
      return;
    }

    scrollRef.current?.scrollTo({ animated: true, x: index * pageWidth });
  }, [activeTab, pageWidth]);

  const syncTabFromScrollOffset = (offsetX: number) => {
    if (pageWidth === 0) {
      return;
    }

    const index = Math.round(offsetX / pageWidth);
    const nextTab = getMainTabFromIndex(index);

    if (nextTab === activeTabRef.current) {
      return;
    }

    skipTabSyncRef.current = true;
    onSelectTab(nextTab);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncTabFromScrollOffset(event.nativeEvent.contentOffset.x);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    syncTabFromScrollOffset(event.nativeEvent.contentOffset.x);
  };

  return (
    <ScrollView
      ref={scrollRef}
      directionalLockEnabled
      horizontal
      nestedScrollEnabled
      pagingEnabled
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator={false}
      style={styles.pager}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;

        if (width > 0) {
          setPageWidth(width);
        }
      }}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onScroll={handleScroll}
    >
      {MAIN_TAB_ORDER.map((tab) => (
        <View
          key={tab}
          style={[styles.page, pageWidth > 0 && { width: pageWidth }]}
        >
          {renderMainTab(tab)}
        </View>
      ))}
    </ScrollView>
  );
}

function renderMainTab(tab: MainTabId) {
  switch (tab) {
    case 'Timeline':
      return <TimelineScreen />;
    case 'PetProfile':
      return <PetProfileScreen />;
    case 'Settings':
      return <SettingsScreen />;
  }
}
