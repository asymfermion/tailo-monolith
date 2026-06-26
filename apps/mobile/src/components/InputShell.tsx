import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppearance } from '@/lib/appearance';

type InputShellProps = {
  children: ReactNode;
  isFocused?: boolean;
  hasError?: boolean;
  isDisabled?: boolean;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export function InputShell({
  children,
  isFocused = false,
  hasError = false,
  isDisabled = false,
  minHeight,
  style,
}: InputShellProps) {
  const { colors } = useAppearance();

  const borderColor = hasError
    ? colors.destructive
    : isFocused
      ? colors.text
      : colors.border;
  const borderWidth = isFocused ? 2 : 1;
  const backgroundColor = isDisabled ? colors.background : colors.surface;

  return (
    <View
      style={[
        styles.shell,
        { backgroundColor, borderColor, borderWidth, minHeight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 52,
  },
});
