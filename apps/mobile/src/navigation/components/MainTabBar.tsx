import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { t, useAppLocale } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';

import type { MainTabId } from '../routes';
import { TAB_BAR_HEIGHT, TAB_BAR_HORIZONTAL_MARGIN } from '../tabBarLayout';
import { useTabBarBottomOffset } from '../useTabBarInsets';

type MainTabBarProps = {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
};

type TabConfig = {
  id: MainTabId;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  accessibilityKey: 'Timeline' | 'PetProfile' | 'Settings';
};

const TABS: TabConfig[] = [
  {
    id: 'Timeline',
    iconActive: 'home',
    iconInactive: 'home-outline',
    accessibilityKey: 'Timeline',
  },
  {
    id: 'PetProfile',
    iconActive: 'paw',
    iconInactive: 'paw-outline',
    accessibilityKey: 'PetProfile',
  },
  {
    id: 'Settings',
    iconActive: 'settings',
    iconInactive: 'settings-outline',
    accessibilityKey: 'Settings',
  },
];

const ICON_SIZE = 26;

/** Soft glass — thin material, content stays readable underneath. */
const blurTint =
  Platform.OS === 'ios' ? 'systemUltraThinMaterialLight' : ('light' as const);

const blurIntensity = Platform.OS === 'ios' ? 42 : 56;

function createMainTabBarStyles({ colors }: AppearanceContextValue) {
  return {
    wrapper: {
      position: 'absolute' as const,
      left: TAB_BAR_HORIZONTAL_MARGIN,
      right: TAB_BAR_HORIZONTAL_MARGIN,
    },
    bar: {
      borderColor: colors.tabBarBorder,
      borderRadius: TAB_BAR_HEIGHT / 2,
      borderWidth: 1,
      elevation: 8,
      flexDirection: 'row' as const,
      height: TAB_BAR_HEIGHT,
      overflow: 'hidden' as const,
      paddingHorizontal: spacing.sm,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    tab: {
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
      zIndex: 1,
    },
  };
}

export function MainTabBar({ activeTab, onSelectTab }: MainTabBarProps) {
  useAppLocale();
  const { colors } = useAppearance();
  const bottomOffset = useTabBarBottomOffset();
  const styles = useThemedStyles(createMainTabBarStyles);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View style={styles.bar}>
        <BlurView
          blurReductionFactor={Platform.OS === 'android' ? 3 : undefined}
          experimentalBlurMethod={
            Platform.OS === 'android' ? 'dimezisBlurView' : undefined
          }
          intensity={blurIntensity}
          style={StyleSheet.absoluteFill}
          tint={blurTint}
        />
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const iconName = isActive ? tab.iconActive : tab.iconInactive;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={t(
                `navigation.tabAccessibility.${tab.accessibilityKey}`,
              )}
              accessibilityState={{ selected: isActive }}
              hitSlop={8}
              style={styles.tab}
              onPress={() => onSelectTab(tab.id)}
            >
              <Ionicons
                color={isActive ? colors.text : colors.textMuted}
                name={iconName}
                size={ICON_SIZE}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
