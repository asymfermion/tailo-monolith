import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HomeIcon } from '@/components/HomeIcon';

import { spacing } from '@/constants/theme';
import { t, useAppLocale } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { useLocalPetProfile } from '@/modules/pets/useLocalPetProfile';

import type { MainTabId } from '../routes';
import { TAB_BAR_HEIGHT, TAB_BAR_HORIZONTAL_MARGIN } from '../tabBarLayout';
import { useTabBarBottomOffset } from '../useTabBarInsets';

type MainTabBarProps = {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
};

type TabConfig = {
  id: MainTabId;
  iconActive: keyof typeof Ionicons.glyphMap | null;
  iconInactive: keyof typeof Ionicons.glyphMap | null;
  accessibilityKey: 'Timeline' | 'PetProfile' | 'Settings';
};

const TABS: TabConfig[] = [
  {
    id: 'Timeline',
    iconActive: null,
    iconInactive: null,
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
const ACTIVE_SCALE = 1.18;

type TabItemProps = {
  tab: TabConfig;
  isActive: boolean;
  colors: AppearanceContextValue['colors'];
  styles: ReturnType<typeof createMainTabBarStyles>;
  petProfile: ReturnType<typeof useLocalPetProfile>;
  petInitial: string;
  onPress: () => void;
};

function TabItem({
  tab,
  isActive,
  colors,
  styles,
  petProfile,
  petInitial,
  onPress,
}: TabItemProps) {
  const scale = useRef(new Animated.Value(isActive ? ACTIVE_SCALE : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isActive ? ACTIVE_SCALE : 1,
      useNativeDriver: true,
      damping: 14,
      mass: 0.7,
      stiffness: 180,
    }).start();
  }, [isActive, scale]);

  const isPetTab = tab.id === 'PetProfile';
  const isHomeTab = tab.id === 'Timeline';
  const iconName = isActive ? tab.iconActive : tab.iconInactive;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={t(
        `navigation.tabAccessibility.${tab.accessibilityKey}`,
      )}
      accessibilityState={{ selected: isActive }}
      hitSlop={8}
      style={isPetTab ? styles.petTab : styles.tab}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {isPetTab ? (
          <View
            style={[
              styles.petAvatarRing,
              isActive ? styles.petAvatarRingActive : null,
            ]}
          >
            {petProfile.profile?.profilePhotoUri ? (
              <Image
                accessibilityLabel={t('accessibility.profilePhoto', {
                  name: petProfile.profile.name,
                })}
                contentFit="cover"
                source={{ uri: petProfile.profile.profilePhotoUri }}
                style={styles.petAvatar}
              />
            ) : (
              <Text style={styles.petAvatarInitial}>{petInitial}</Text>
            )}
          </View>
        ) : isHomeTab ? (
          <HomeIcon
            color={isActive ? colors.text : colors.textMuted}
            size={ICON_SIZE}
          />
        ) : (
          <Ionicons
            color={isActive ? colors.text : colors.textMuted}
            name={iconName!}
            size={ICON_SIZE}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Soft glass — thin material, content stays readable underneath. */
const blurTint =
  Platform.OS === 'ios' ? 'systemUltraThinMaterialLight' : ('light' as const);

const blurIntensity = Platform.OS === 'ios' ? 42 : 56;

function createMainTabBarStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
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
    petTab: {
      alignItems: 'center' as const,
      flex: 1,
      justifyContent: 'center' as const,
      zIndex: 1,
    },
    petAvatarRing: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.tabBarBorder,
      borderRadius: 24,
      borderWidth: 1,
      height: 48,
      justifyContent: 'center' as const,
      width: 48,
    },
    petAvatarRingActive: {
      borderColor: colors.accent,
      borderWidth: 2,
    },
    petAvatar: {
      backgroundColor: colors.border,
      borderRadius: 20,
      height: 40,
      overflow: 'hidden' as const,
      width: 40,
    },
    petAvatarInitial: {
      color: colors.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 17,
      fontWeight: '700' as const,
    },
  };
}

export function MainTabBar({ activeTab, onSelectTab }: MainTabBarProps) {
  useAppLocale();
  const { colors } = useAppearance();
  const petProfile = useLocalPetProfile();
  const bottomOffset = useTabBarBottomOffset();
  const styles = useThemedStyles(createMainTabBarStyles);
  const petInitial =
    petProfile.profile?.name.trim().slice(0, 1).toUpperCase() || 'P';

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
        {TABS.map((tab) => (
          <TabItem
            key={tab.id}
            colors={colors}
            isActive={tab.id === activeTab}
            petInitial={petInitial}
            petProfile={petProfile}
            styles={styles}
            tab={tab}
            onPress={() => onSelectTab(tab.id)}
          />
        ))}
      </View>
    </View>
  );
}
