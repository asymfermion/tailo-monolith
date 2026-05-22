import { Text, TextInput } from 'react-native';

/** Prevent layout blow-up when users enable very large system text. */
export const MAX_FONT_SIZE_MULTIPLIER = 1.35;

export function configureTextAccessibility(): void {
  Text.defaultProps = Text.defaultProps ?? {};
  Text.defaultProps.allowFontScaling = true;
  Text.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;

  TextInput.defaultProps = TextInput.defaultProps ?? {};
  TextInput.defaultProps.allowFontScaling = true;
  TextInput.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;
}
