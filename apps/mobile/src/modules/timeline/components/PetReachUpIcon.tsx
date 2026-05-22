import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import type { LocalPetType } from '@/modules/pets';

type PetReachUpIconProps = {
  color: string;
  petType: LocalPetType;
  size?: number;
};

/** Recognizable dog or cat with an upward cue (reaching toward the top). */
export function PetReachUpIcon({
  color,
  petType,
  size = 36,
}: PetReachUpIconProps) {
  const petIconName = petType === 'cat' ? 'cat' : 'dog';

  return (
    <View style={[styles.root, { height: size, width: size }]}>
      <MaterialCommunityIcons
        color={color}
        name="chevron-double-up"
        size={Math.round(size * 0.34)}
        style={styles.reachCue}
      />
      <MaterialCommunityIcons
        color={color}
        name={petIconName}
        size={Math.round(size * 0.76)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachCue: {
    marginBottom: -2,
  },
});
