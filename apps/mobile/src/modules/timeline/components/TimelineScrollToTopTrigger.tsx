import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { spacing } from '@/constants/theme';
import { t } from '@/i18n';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { MIN_TOUCH_TARGET } from '@/lib/responsive';
import { loadLocalPetProfile, type LocalPetType } from '@/modules/pets';

import { PetReachUpIcon } from './PetReachUpIcon';

function createTimelineScrollToTopTriggerStyles({
  colors,
}: AppearanceContextValue) {
  return {
    trigger: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: MIN_TOUCH_TARGET,
      justifyContent: 'center' as const,
      width: MIN_TOUCH_TARGET,
    },
    triggerPressed: {
      opacity: 0.7,
    },
  };
}

type TimelineScrollToTopTriggerProps = {
  onPress: () => void;
};

/** Top-bar scroll-to-top control; matches filter trigger size and shape. */
export function TimelineScrollToTopTrigger({
  onPress,
}: TimelineScrollToTopTriggerProps) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createTimelineScrollToTopTriggerStyles);
  const [petType, setPetType] = useState<LocalPetType>('dog');

  useEffect(() => {
    void loadLocalPetProfile().then((profile) => {
      if (profile?.type) {
        setPetType(profile.type);
      }
    });
  }, []);

  return (
    <Pressable
      accessibilityLabel={t('timeline.scrollToTop')}
      accessibilityRole="button"
      hitSlop={spacing.xs}
      style={({ pressed }) => [
        styles.trigger,
        pressed && styles.triggerPressed,
      ]}
      onPress={onPress}
    >
      <PetReachUpIcon color={colors.accent} petType={petType} size={28} />
    </Pressable>
  );
}
